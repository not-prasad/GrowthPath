from __future__ import annotations

import json
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from flask import current_app
try:
    from backend.config import Config
except ImportError:
    Config = None

from ..database import query_one, execute


def _get_config_val(key: str, default: Any = None) -> Any:
    # Try current_app first, then static Config class
    try:
        if current_app:
            return current_app.config.get(key, default)
    except Exception:
        pass
    if Config:
        return getattr(Config, key, default)
    return default


def build_insights_prompt(*, goal_title: str, trends: Dict[str, Any], recent_days: List[Dict[str, Any]]) -> str:
    return (
        "You are a Personal Performance Lab analyst.\n"
        f"Goal: {goal_title}\n"
        f"Trend: {trends.get('trend','stable')}\n"
        f"Recent days: {recent_days}\n"
        "Return ONLY valid JSON: an array of 3 objects with {title, body, type}.\n"
        "type must be one of: positive, warning, info.\n"
        "Be analytical, concise, no motivational fluff.\n"
    )


def _deterministic_insights(trends: Dict[str, Any], recent_days: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Provides meaningful insights based on raw trends when AI is unavailable.
    """
    insights = []
    
    # 1. Trend Analysis
    trend = trends.get("trend", "stable")
    if trend == "up":
        insights.append({
            "title": "Positive Momentum", 
            "body": "Your performance score is trending upwards. Whatever routine you're in, it's working.", 
            "type": "positive"
        })
    elif trend == "down":
        insights.append({
            "title": "Efficiency Dip", 
            "body": "Your scores are trending lower. Review recent logs for increased friction or low energy.", 
            "type": "warning"
        })
    else:
        insights.append({
            "title": "Steady State", 
            "body": "Consistency is good. To push further, try increasing focus on your primary task.", 
            "type": "info"
        })

    # 2. Focus Correlation
    if recent_days:
        avg_focus = sum(float(d.get("focus_level") or 0) for d in recent_days) / len(recent_days)
        if avg_focus >= 4.0:
            insights.append({
                "title": "High Density Focus", 
                "body": "Your focus levels are exceptional. This deep work is a major performance driver.", 
                "type": "positive"
            })
        elif avg_focus <= 2.5:
            insights.append({
                "title": "Focus Volatility", 
                "body": "Lower focus levels detected recently. Check your environment for distractions.", 
                "type": "warning"
            })

    # 3. Energy Resilience
    if recent_days:
        energies = [d.get("energy_state") for d in recent_days if d.get("energy_state")]
        low_count = energies.count("Low")
        if low_count >= 3:
            insights.append({
                "title": "Recovery Alert", 
                "body": "Multiple low energy days detected. Prioritize recovery and sleep to avoid burnout.", 
                "type": "warning"
            })
        elif "High" in energies:
            insights.append({
                "title": "Peak Energy Utilization", 
                "body": "You are making the most of your high energy windows. Keep tracking these spikes.", 
                "type": "positive"
            })

    # Final Fallback if still empty
    if len(insights) < 3:
        insights.append({"title": "Log Integrity", "body": "Continue consistent logging to uncover more subtle performance patterns.", "type": "info"})
    
    return insights[:3]


def get_ai_insights(*, goal_title: str, trends: Dict[str, Any], recent_days: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Returns AI insights using Groq if available, otherwise deterministic fallback.
    """
    api_key = _get_config_val("GROQ_API_KEY")
    deterministic = _deterministic_insights(trends, recent_days)

    if not api_key:
        return deterministic

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        
        prompt = build_insights_prompt(goal_title=goal_title, trends=trends, recent_days=recent_days)
        
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )
        
        raw = (resp.choices[0].message.content or "").strip()
        # Bug Fix: Use more robust JSON extraction (regex-like)
        import re
        json_match = re.search(r'\[\s*\{.*\}\s*\]', raw, re.DOTALL)
        if json_match:
            raw = json_match.group(0)
        elif "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        
        parsed = json.loads(raw)
        if isinstance(parsed, list) and len(parsed) >= 2:
            # Successfully got AI insights
            return [
                {
                    "title": str(p.get("title", "Insight")), 
                    "body": str(p.get("body", "")), 
                    "type": str(p.get("type", "info")).lower()
                } for p in parsed[:3]
            ]
        
        return deterministic
    except Exception as e:
        print(f"AI Insights Error: {e}")
        return deterministic


def _context_hash(context: Dict[str, Any]) -> str:
    payload = json.dumps(context, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _cache_get(cache_key: str, user_id: int, goal_id: int, context_hash: str) -> Optional[Dict[str, Any]]:
    row = query_one(
        """
        SELECT payload
        FROM ai_cache
        WHERE cache_key=? AND user_id=? AND goal_id=? AND context_hash=? AND expires_at > datetime('now')
        """,
        (cache_key, user_id, goal_id, context_hash),
    )
    if not row:
        return None
    try:
        return json.loads(row["payload"])
    except Exception:
        return None


def _cache_set(cache_key: str, user_id: int, goal_id: int, context_hash: str, payload: Dict[str, Any], ttl_minutes: int = 60) -> None:
    expires_at = (datetime.utcnow() + timedelta(minutes=max(ttl_minutes, 1))).strftime("%Y-%m-%d %H:%M:%S")
    execute(
        """
        INSERT INTO ai_cache(cache_key, user_id, goal_id, context_hash, payload, expires_at)
        VALUES (?,?,?,?,?,?)
        ON CONFLICT(cache_key) DO UPDATE SET
            user_id=excluded.user_id,
            goal_id=excluded.goal_id,
            context_hash=excluded.context_hash,
            payload=excluded.payload,
            expires_at=excluded.expires_at,
            created_at=datetime('now')
        """,
        (cache_key, user_id, goal_id, context_hash, json.dumps(payload), expires_at),
    )


def _deterministic_daily_brief(context: Dict[str, Any]) -> str:
    line_interp = str(context.get("line_interpretation", "Your trend is stable."))
    cat_interp = str(context.get("category_interpretation", "Task completion is balanced."))
    return f"{line_interp} {cat_interp}"


def _deterministic_root_cause(context: Dict[str, Any]) -> str:
    line_stats = context.get("line_stats", {}) or {}
    focus_corr = float((context.get("focus_scatter_stats", {}) or {}).get("correlation", 0) or 0)
    friction_corr = float((context.get("friction_scatter_stats", {}) or {}).get("correlation", 0) or 0)
    delta = float(line_stats.get("delta", 0) or 0)

    if delta < -1:
        if friction_corr <= -0.5:
            return "Recent dip appears linked to rising friction. Reduce blockers first before increasing workload."
        if focus_corr >= 0.3:
            return "Recent dip appears linked to lower focus consistency. Protect focused time for your primary task."
        return "Recent dip is visible, but no single strong driver stands out. Keep tasks simpler for a few days and reassess."
    return "No major dip detected recently. Keep your current routine and monitor consistency."


def _deterministic_weekly_retro(context: Dict[str, Any]) -> str:
    weekday_stats = context.get("weekday_stats", {}) or {}
    best = weekday_stats.get("best_weekday")
    worst = weekday_stats.get("worst_weekday")
    if best:
        return f"Your peak performance consistently occurs on {best}. Try to schedule your most demanding 'Primary' tasks for this day next week."
    return "Weekly patterns are emerging. Continue logging to see which day of the week is your strongest performance window."


def _build_ai_brief_prompt(context: Dict[str, Any]) -> str:
    return (
        "You are a performance analyst. Keep responses practical and concise.\n"
        "Use only this precomputed analytics summary:\n"
        f"{json.dumps(context, ensure_ascii=False)}\n"
        "Return valid JSON ONLY:\n"
        '{'
        '"daily_analyst_brief":"1-2 sentence plain summary",'
        '"root_cause_dip_detection":"1-2 sentence root cause suggestion",'
        '"weekly_retro":"1-2 sentence weekly review"'
        "}"
    )


def _call_groq(prompt: str) -> Optional[Dict[str, Any]]:
    api_key = _get_config_val("GROQ_API_KEY")
    if not api_key:
        return None
    try:
        from groq import Groq  # local import to keep startup resilient

        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = (resp.choices[0].message.content or "").strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            return None
        return {
            "daily_analyst_brief": str(parsed.get("daily_analyst_brief", "")).strip(),
            "root_cause_dip_detection": str(parsed.get("root_cause_dip_detection", "")).strip(),
            "weekly_retro": str(parsed.get("weekly_retro", "")).strip(),
        }
    except Exception:
        return None


def _deterministic_tasks(goal_title: str, category: Optional[str] = None) -> List[str]:
    cat_and_title = f"{(category or '')} {goal_title}".lower()
    
    if any(kw in cat_and_title for kw in ["health", "fitness", "weight", "diet", "gym", "workout"]):
        return [
            "Complete 45m zone-2 cardio session",
            "Log all macronutrients for today",
            "Perform 3 sets of compound lifts",
            "Consume 3 liters of water",
            "Walk 12,000 steps"
        ]
    if any(kw in cat_and_title for kw in ["code", "software", "dev", "program", "app"]):
        return [
            "Implement one new backend endpoint",
            "Write 5 comprehensive unit tests",
            "Refactor one complex function",
            "Document 2 API endpoints",
            "Fix one open bug from the tracker"
        ]
    if any(kw in cat_and_title for kw in ["data", "analyt", "sql", "model"]):
        return [
            "Clean and validate 100+ rows of raw data",
            "Execute 3 exploratory data queries",
            "Update one visualization dashboard",
            "Identify 2 key statistical correlations",
            "Document data cleaning steps"
        ]
    
    return [
        f"Execute primary high-leverage action for {goal_title}",
        "Remove one physical friction point from environment",
        "Log all supporting performance variables",
        "Complete 25m deep focus sprint",
        "Finalize top-priority target for tomorrow"
    ]


def _build_task_prompt(goal_title: str, deadline_days: int, category: Optional[str] = None) -> str:
    cat_context = f"This is a {category} goal." if category else ""
    return (
        "You are a Practical Performance Coach. Your goal is to provide 5 simple, actionable steps for today.\n"
        f"Target Goal: {goal_title}\n"
        f"{cat_context}\n"
        f"Remaining Timeline: {deadline_days} days.\n\n"
        "STRICT EXECUTION RULES:\n"
        "1. NO JARGON: Use simple, everyday language that anyone can understand.\n"
        "2. PRACTICAL & ACTIONABLE: Every task must be something you can physically do in under 30 minutes.\n"
        "3. RELATED TO GOAL: Ensure tasks directly help the user move toward their specific target.\n"
        "4. HUMAN TONE: Talk like a supportive coach, not a machine or a technical analyst.\n"
        "5. EXACTLY 5 TASKS.\n\n"
        "EXAMPLE FOR FITNESS: 'Pack your gym bag and put it by the door for tomorrow morning'\n"
        "EXAMPLE FOR CODING: 'Watch one 10-minute tutorial on a feature you want to build'\n\n"
        "Return ONLY a JSON array of 5 strings."
    )


def generate_ai_tasks(*, goal_title: str, deadline_days: int, category: Optional[str] = None) -> List[str]:
    """
    Generates actionable daily tasks for a specific goal.
    """
    api_key = _get_config_val("GROQ_API_KEY")
    if not api_key:
        return _deterministic_tasks(goal_title, category)

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.4,
            messages=[{"role": "user", "content": _build_task_prompt(goal_title, deadline_days, category)}],
        )
        raw = (resp.choices[0].message.content or "").strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(t).strip() for t in parsed[:5]]
        return _deterministic_tasks(goal_title, category)
    except Exception as e:
        print(f"AI Task Gen Error: {e}")
        return _deterministic_tasks(goal_title, category)


def get_ai_brief(*, user_id: int, goal_id: int, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Suggestion-only AI brief pipeline.
    - Input must be precomputed analytics (no raw DB mutation logic here).
    - All outputs are cached.
    """
    h = _context_hash(context)
    cache_key = f"brief:{user_id}:{goal_id}"
    cached = _cache_get(cache_key, user_id, goal_id, h)
    if cached:
        cached["meta"] = {**(cached.get("meta") or {}), "cached": True}
        return cached

    # Deterministic baseline always available.
    deterministic = {
        "daily_analyst_brief": _deterministic_daily_brief(context),
        "root_cause_dip_detection": _deterministic_root_cause(context),
        "weekly_retro": _deterministic_weekly_retro(context),
    }

    # Optional AI refinement from Groq, suggestion-only.
    ai_payload = _call_groq(_build_ai_brief_prompt(context))
    result = ai_payload if ai_payload else deterministic
    if ai_payload:
        # Fill any missing fields with deterministic fallbacks.
        for k, v in deterministic.items():
            if not result.get(k):
                result[k] = v

    payload = {
        "daily_analyst_brief": result["daily_analyst_brief"],
        "root_cause_dip_detection": result["root_cause_dip_detection"],
        "weekly_retro": result["weekly_retro"],
        "meta": {
            "cached": False,
            "provider": "groq" if ai_payload else "deterministic",
            "suggestion_only": True,
        },
    }
    _cache_set(cache_key, user_id, goal_id, h, payload, ttl_minutes=60)
    return payload

