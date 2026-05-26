from __future__ import annotations

from flask import Blueprint, jsonify, request, send_file, make_response
from flask_jwt_extended import get_jwt_identity, jwt_required
from fpdf import FPDF
import io
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')

from ..config import AppConfig
from ..database import query_all
from ..services.analytics_engine import (
    compute_boxplot,
    compute_completion_by_category,
    compute_full_analysis,
    compute_line_chart,
    compute_scatter_focus_vs_score,
    compute_scatter_friction_vs_score,
    compute_trends,
    compute_weekday_analysis,
    compute_streak,
    interpret_boxplot,
    interpret_category_completion,
    interpret_line,
    interpret_scatter,
    interpret_weekday,
)
from ..utils.validation import as_date_yyyy_mm_dd, as_int
from .logs import _resolve_goal_id


bp = Blueprint("analytics", __name__, url_prefix="/api")


@bp.get("/performance/trends")
@jwt_required()
def performance_trends():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    days = request.args.get("days")
    n = AppConfig.DEFAULT_TRENDS_DAYS
    if days is not None:
        n = as_int(days, field="days", min_val=1, max_val=365, default=AppConfig.DEFAULT_TRENDS_DAYS)

    rows = query_all(
        """
        SELECT log_date, performance_score, focus_level, energy_state
        FROM daily_logs
        WHERE user_id=? AND goal_id=?
        ORDER BY log_date DESC
        """,
        (user_id, goal_id),
    )
    return jsonify({"goal_id": goal_id, "trends": compute_trends(rows, days=n)})


@bp.get("/analytics/weeks")
@jwt_required()
def analytics_weeks():
    """
    Returns a list of start/end dates for weeks that have log data.
    Format: [{ week_start: "YYYY-MM-DD", label: "Apr 27 - May 03" }]
    """
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    
    rows = query_all(
        "SELECT log_date FROM daily_logs WHERE user_id=? AND goal_id=? ORDER BY log_date ASC",
        (user_id, goal_id)
    )
    if not rows:
        return jsonify([])

    # Group into weeks (Mon-Sun)
    weeks = []
    seen_starts = set()
    
    for r in rows:
        dt = datetime.strptime(r['log_date'], "%Y-%m-%d")
        # Monday is 0, Sunday is 6
        start_of_week = dt - timedelta(days=dt.weekday())
        start_str = start_of_week.strftime("%Y-%m-%d")
        
        if start_str not in seen_starts:
            end_of_week = start_of_week + timedelta(days=6)
            end_str = end_of_week.strftime("%Y-%m-%d")
            
            label = f"{start_of_week.strftime('%b %d')} - {end_of_week.strftime('%b %d')}"
            weeks.append({
                "week_start": start_str,
                "week_end": end_str,
                "label": label
            })
            seen_starts.add(start_str)
            
    return jsonify(weeks[::-1]) # Most recent first


def _load_logs(user_id: int, goal_id: int):
    date_from = request.args.get("from")
    date_to = request.args.get("to")
    limit = request.args.get("limit")
    offset = request.args.get("offset")

    if date_from is not None:
        date_from = as_date_yyyy_mm_dd(date_from, field="from")
    if date_to is not None:
        date_to = as_date_yyyy_mm_dd(date_to, field="to")

    lim = AppConfig.DEFAULT_LOG_LIMIT
    if limit is not None:
        lim = as_int(limit, field="limit", min_val=1, max_val=AppConfig.MAX_LOG_LIMIT, default=AppConfig.DEFAULT_LOG_LIMIT)
    off = 0
    if offset is not None:
        off = as_int(offset, field="offset", min_val=0, max_val=100000, default=0)

    where = ["user_id=? AND goal_id=?"]
    params = [user_id, goal_id]
    if date_from:
        where.append("log_date >= ?")
        params.append(date_from)
    if date_to:
        where.append("log_date <= ?")
        params.append(date_to)

    rows = query_all(
        f"""
        SELECT log_date, performance_score, focus_level, friction_count, energy_state
        FROM daily_logs
        WHERE {' AND '.join(where)}
        ORDER BY log_date ASC
        LIMIT ? OFFSET ?
        """,
        tuple(params + [lim, off]),
    )
    return rows


def _load_tasks(user_id: int, goal_id: int):
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    if date_from is not None:
        date_from = as_date_yyyy_mm_dd(date_from, field="from")
    if date_to is not None:
        date_to = as_date_yyyy_mm_dd(date_to, field="to")

    where = ["user_id=? AND goal_id=?"]
    params = [user_id, goal_id]
    if date_from:
        where.append("log_date >= ?")
        params.append(date_from)
    if date_to:
        where.append("log_date <= ?")
        params.append(date_to)

    rows = query_all(
        f"""
        SELECT log_date, task_type, is_completed
        FROM daily_tasks
        WHERE {' AND '.join(where)}
        """,
        tuple(params),
    )
    return rows


@bp.get("/analytics/line")
@jwt_required()
def viz_line():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    logs = _load_logs(user_id, goal_id)
    return jsonify({"goal_id": goal_id, "line": interpret_line(compute_line_chart(logs))})


@bp.get("/analytics/boxplot")
@jwt_required()
def viz_boxplot():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    logs = _load_logs(user_id, goal_id)
    return jsonify({"goal_id": goal_id, "boxplot": interpret_boxplot(compute_boxplot(logs))})


@bp.get("/analytics/category-completion")
@jwt_required()
def viz_category_completion():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    tasks = _load_tasks(user_id, goal_id)
    return jsonify({"goal_id": goal_id, "bar": interpret_category_completion(compute_completion_by_category(tasks))})


@bp.get("/analytics/weekday")
@jwt_required()
def viz_weekday():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    threshold_raw = request.args.get("completion_threshold")
    threshold = 70.0
    if threshold_raw is not None:
        try:
            threshold = float(threshold_raw)
        except Exception:
            threshold = 70.0
    logs = _load_logs(user_id, goal_id)
    return jsonify({"goal_id": goal_id, "weekday": interpret_weekday(compute_weekday_analysis(logs, completion_threshold=threshold))})


@bp.get("/analytics/scatter/focus")
@jwt_required()
def viz_scatter_focus():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    logs = _load_logs(user_id, goal_id)
    return jsonify({"goal_id": goal_id, "scatter": interpret_scatter(compute_scatter_focus_vs_score(logs), kind="focus")})


@bp.get("/analytics/scatter/friction")
@jwt_required()
def viz_scatter_friction():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    logs = _load_logs(user_id, goal_id)
    return jsonify({"goal_id": goal_id, "scatter": interpret_scatter(compute_scatter_friction_vs_score(logs), kind="friction")})
@bp.get("/analytics/summary")
@jwt_required()
def viz_summary():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    logs = _load_logs(user_id, goal_id)
    tasks = _load_tasks(user_id, goal_id)
    return jsonify({
        "goal_id": goal_id, 
        "summary": compute_full_analysis(logs, tasks)
    })

@bp.get("/analytics/streak")
@jwt_required()
def analytics_streak():
    user_id = int(get_jwt_identity())
    goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
    
    # Load all historical logs without limit to calculate full streak
    logs = query_all(
        """
        SELECT log_date
        FROM daily_logs
        WHERE user_id=? AND goal_id=?
        ORDER BY log_date ASC
        """,
        (user_id, goal_id)
    )
    
    return jsonify({
        "goal_id": goal_id,
        "streak": compute_streak(logs, today_date_str=request.args.get("today_date"))
    })

@bp.get("/analytics/export/pdf")
@jwt_required()
def export_pdf():
    try:
        user_id = int(get_jwt_identity())
        goal_id = _resolve_goal_id(user_id, request.args.get("goal_id"))
        
        # 1. Fetch Goal Context with safety
        goals_list = query_all("SELECT title, category FROM goals WHERE id=?", (goal_id,))
        if not goals_list:
            return jsonify({"error": "Goal not found"}), 404
            
        goal_title = goals_list[0]['title']
        goal_category = goals_list[0]['category'] or "Goal Mastery"
        
        logs = query_all(
            "SELECT log_date, performance_score, focus_level, energy_state FROM daily_logs WHERE user_id=? AND goal_id=? ORDER BY log_date ASC LIMIT 100",
            (user_id, goal_id)
        )
        
        # 2. Setup PDF
        class PDF(FPDF):
            def header(self):
                self.set_fill_color(99, 102, 241) # Indigo
                self.rect(0, 0, 210, 40, 'F')
                self.set_font('Helvetica', 'B', 22)
                self.set_text_color(255, 255, 255)
                self.cell(0, 10, 'GrowthPath Performance Audit', ln=True, align='C')
                self.set_font('Helvetica', '', 10)
                self.cell(0, 10, f'Official Behavioral Analysis Report - {datetime.now().strftime("%Y-%m-%d")}', ln=True, align='C')
                self.ln(20)

            def footer(self):
                self.set_y(-15)
                self.set_font('Helvetica', 'I', 8)
                self.set_text_color(128, 128, 128)
                self.cell(0, 10, f'Page {self.page_no()}', align='C')

        pdf = PDF()
        pdf.add_page()
        
        # Goal Header Section
        pdf.set_text_color(30, 41, 59)
        pdf.set_font('Helvetica', 'B', 16)
        pdf.cell(0, 10, f"Goal: {goal_title}", ln=True)
        pdf.set_font('Helvetica', '', 11)
        pdf.cell(0, 7, f"Category: {goal_category}", ln=True)
        pdf.ln(5)
        
        # Metrics Summary Grid
        avg_score = sum(l['performance_score'] for l in logs) / len(logs) if logs else 0
        pdf.set_fill_color(248, 250, 252) # Light background
        pdf.set_draw_color(226, 232, 240)
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(60, 15, f"Avg Score: {round(avg_score, 1)}%", border=1, fill=True, align='C')
        pdf.cell(60, 15, f"Days Tracked: {len(logs)}", border=1, fill=True, align='C')
        pdf.cell(60, 15, f"Status: ACTIVE", border=1, fill=True, align='C')
        pdf.ln(20)
        
        # --- CHART GENERATION ---
        if len(logs) >= 3:
            try:
                plt.figure(figsize=(8, 4), dpi=100)
                subset = logs[-15:]
                dates = [l['log_date'][-5:] for l in subset]
                scores = [l['performance_score'] for l in subset]
                
                plt.plot(dates, scores, marker='o', color='#6366f1', linewidth=2, markersize=6)
                plt.fill_between(dates, scores, color='#6366f1', alpha=0.1)
                plt.title('Performance Trajectory (Last 15 Records)', fontsize=12, fontweight='bold', color='#1e293b')
                plt.ylim(0, 110)
                plt.grid(axis='y', linestyle='--', alpha=0.3)
                plt.tight_layout()
                
                img_buf = io.BytesIO()
                plt.savefig(img_buf, format='png')
                img_buf.seek(0)
                pdf.image(img_buf, x=15, y=pdf.get_y(), w=180)
                plt.close()
                pdf.ln(90)
            except Exception as chart_err:
                print(f"Chart Generation Error: {chart_err}")
                pdf.cell(0, 10, "(Charts could not be generated)", ln=True)

        # --- DATA TABLE ---
        pdf.add_page()
        pdf.set_font('Helvetica', 'B', 14)
        pdf.cell(0, 10, "Consistency Ledger", ln=True)
        pdf.ln(5)
        
        pdf.set_font('Helvetica', 'B', 11)
        pdf.set_fill_color(99, 102, 241)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(50, 10, 'Date', 1, 0, 'C', True)
        pdf.cell(45, 10, 'Score', 1, 0, 'C', True)
        pdf.cell(45, 10, 'Focus', 1, 0, 'C', True)
        pdf.cell(40, 10, 'Energy', 1, 1, 'C', True)
        
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(30, 41, 59)
        fill = False
        for log in logs[::-1][:30]:
            pdf.set_fill_color(249, 250, 251) if fill else pdf.set_fill_color(255, 255, 255)
            pdf.cell(50, 8, str(log['log_date']), 1, 0, 'C', True)
            pdf.cell(45, 8, f"{round(log['performance_score'] or 0, 1)}%", 1, 0, 'C', True)
            pdf.cell(45, 8, f"{round(log['focus_level'] or 0, 1)}/5", 1, 0, 'C', True)
            pdf.cell(40, 8, str(log['energy_state'] or "Stable"), 1, 1, 'C', True)
            fill = not fill

        pdf_output = pdf.output()
        return send_file(
            io.BytesIO(pdf_output),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'GrowthPath_Report_{goal_id}.pdf'
        )
    except Exception as e:
        import traceback
        print(f"CRITICAL PDF ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
