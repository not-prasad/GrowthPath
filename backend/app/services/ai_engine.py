from __future__ import annotations

import json
import hashlib
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


def _sanitize_task_title(title: str) -> str:
    """Strip URLs, tutorial references, and parenthetical link noise from task titles."""
    # Remove URLs (http/https/www)
    title = re.sub(r'https?://\S+', '', title)
    title = re.sub(r'www\.\S+', '', title)
    # Remove patterns like "(Tutorial: ...)" or "[Tutorial: ...]"
    title = re.sub(r'\s*[\(\[]\s*[Tt]utorial\s*[:;]?\s*[^\)\]]*[\)\]]', '', title)
    # Remove trailing/leading whitespace and punctuation artifacts
    title = re.sub(r'\s{2,}', ' ', title).strip().rstrip('()[] ')
    return title

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
        
        import re
        # More robust JSON extraction: find first [ and last ]
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


def _deterministic_tasks(goal_title: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
    cat_and_title = f"{(category or '')} {goal_title}".lower()
    
    def _t(t, d, time, diff, yt):
        return {"title": t, "description": d, "estimated_time": time, "difficulty": diff, "youtube_search_query": yt}
        
    # 1. Tech / Coding
    if any(kw in cat_and_title for kw in ["code", "software", "dev", "program", "app", "react", "python", "javascript", "ts"]):
        return [
            _t(f"Set up local development environment for {goal_title}", "Install necessary tools and SDKs.", "30m", "Easy", "how to setup development environment programming"),
            _t("Review foundational prerequisites and syntax", "Skim the basic language docs.", "45m", "Easy", "programming syntax basics for beginners"),
            _t("Initialize primary project repository", "Create git repo and scaffold.", "15m", "Easy", "how to initialize git repository and project scaffold"),
            _t("Complete first module of core documentation", "Read through the main getting started guide.", "60m", "Medium", "reading technical documentation tips"),
            _t("Execute one small code implementation test", "Write a hello world or simple function.", "30m", "Medium", "coding simple test function beginner")
        ]
    
    # 2. Fitness / Health
    if any(kw in cat_and_title for kw in ["health", "fitness", "weight", "diet", "gym", "workout", "run"]):
        return [
            _t("Conduct baseline physical assessment", "Weigh in, take photos, test baseline reps.", "20m", "Easy", "how to do a beginner fitness assessment"),
            _t("Finalize weekly nutrition and hydration plan", "Plan your meals and water intake.", "30m", "Easy", "beginner weekly meal prep and hydration"),
            _t("Prepare environment (gear, bag, space)", "Set out clothes and clear workout space.", "10m", "Easy", "how to prepare for morning workout"),
            _t("Execute 30m foundational movement session", "Light cardio and bodyweight movements.", "30m", "Medium", "30 minute beginner full body workout"),
            _t("Log recovery and energy metrics", "Note how you feel after day 1.", "5m", "Easy", "how to track fitness recovery metrics")
        ]

    # 3. Data / SQL
    if any(kw in cat_and_title for kw in ["data", "analyt", "sql", "model", "database"]):
        return [
            _t("Clean and validate initial raw dataset", "Remove nulls and check formats.", "45m", "Medium", "beginner data cleaning tutorial"),
            _t("Execute exploratory data queries", "Run simple SELECT and GROUP BY queries.", "45m", "Medium", "SQL exploratory data analysis basics"),
            _t("Update primary visualization dashboard", "Add one new chart.", "30m", "Medium", "beginner data visualization dashboard tutorial"),
            _t("Identify statistical correlations in data", "Look for variables that move together.", "60m", "Hard", "how to find correlations in data beginner"),
            _t("Document data processing steps", "Write down what you did.", "15m", "Easy", "how to document data analysis workflow")
        ]
    
    # Default High-Performance Fallback
    return [
        _t(f"Execute primary high-leverage action for {goal_title}", "Do the most important thing.", "60m", "Medium", "how to focus on high leverage tasks"),
        _t("Identify and remove one physical friction point", "Clean desk or remove distraction.", "15m", "Easy", "how to optimize environment for productivity"),
        _t("Log all supporting performance variables", "Update your tracker.", "5m", "Easy", "habit tracking for beginners"),
        _t("Complete 25m deep focus sprint", "Use pomodoro technique.", "25m", "Medium", "pomodoro technique 25 minutes"),
        _t("Finalize top-priority target for tomorrow", "Plan ahead.", "10m", "Easy", "how to plan your day effectively")
    ]


def _build_task_prompt(
    goal_title: str, 
    deadline_days: int, 
    day_number: int = 1,
    consistency_score: float = 1.0,
    category: Optional[str] = None,
    difficulty: Optional[str] = "Medium",
    commitment: Optional[str] = "Balanced",
    motivation: Optional[str] = ""
) -> str:
    return (
        "You are an intelligent, empathetic personal coach.\n\n"
        f"User Goal: \"{goal_title}\"\n"
        f"Timeline: {deadline_days} days\n"
        f"Current Progress: Day {day_number} of {deadline_days}\n"
        f"Recent Consistency: {int(consistency_score * 100)}%\n"
        f"User Preference - Difficulty: {difficulty}\n"
        f"User Preference - Daily Time: {commitment}\n"
        f"Strategic Context: \"{motivation}\"\n\n"
        "Your job is to generate 5 highly realistic, practical, and concrete tasks for TODAY that directly help achieve the goal.\n\n"
        "STRICT COACHING RULES:\n"
        "- Tasks MUST be realistic and beginner-friendly if early in the timeline (Day 1-5).\n"
        "- Progressive Overload: Slowly increase difficulty over time. Do not give advanced tasks on Day 1.\n"
        "- Adapt to Consistency: If consistency is low (< 50%), make tasks EASIER to build momentum. If high, push them slightly.\n"
        "- No generic productivity tasks (e.g. 'plan the day'). Keep it specific to the goal.\n"
        "- NEVER include URLs, links, or tutorial references in task titles.\n\n"
        "YOUTUBE SEARCH QUERY RULE:\n"
        "- Generate a smart 'youtube_search_query' for each task.\n"
        "- DO NOT just use the task title.\n"
        "- Use broad, highly-searched terms that will find a good tutorial (e.g. instead of 'execute foundational movement', use '15 minute beginner full body workout').\n\n"
        "OUTPUT FORMAT:\n"
        "Return ONLY a JSON array of objects with the exact keys: title, description, estimated_time, difficulty, youtube_search_query.\n"
        "Example:\n"
        "[\n"
        "  {\n"
        "    \"title\": \"Do a 15-minute beginner workout\",\n"
        "    \"description\": \"Start with light movements to get blood flowing.\",\n"
        "    \"estimated_time\": \"15m\",\n"
        "    \"difficulty\": \"Easy\",\n"
        "    \"youtube_search_query\": \"15 minute beginner full body workout no equipment\"\n"
        "  }\n"
        "]\n"
    )


def generate_ai_tasks(
    *, 
    goal_title: str, 
    deadline_days: int, 
    day_number: int = 1,
    consistency_score: float = 1.0,
    category: Optional[str] = None,
    difficulty: Optional[str] = "Medium",
    commitment: Optional[str] = "Balanced",
    motivation: Optional[str] = ""
) -> List[Dict[str, Any]]:
    """
    Generates actionable daily tasks for a specific goal using progressive coaching logic.
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
            messages=[{"role": "user", "content": _build_task_prompt(
                goal_title=goal_title,
                deadline_days=deadline_days,
                day_number=day_number,
                consistency_score=consistency_score,
                category=category,
                difficulty=difficulty,
                commitment=commitment,
                motivation=motivation
            )}],
        )
        raw = (resp.choices[0].message.content or "").strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            res = []
            for t in parsed[:5]:
                if isinstance(t, dict) and "title" in t:
                    t["title"] = _sanitize_task_title(str(t["title"]).strip())
                    res.append(t)
            if res:
                return res
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

