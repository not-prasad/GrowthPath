# GrowthPath — Personal Performance Lab
## Project Documentation

### 1. Project Overview
GrowthPath is a comprehensive, gamified personal performance tracking application. It is designed to help users log their daily activities, manage goals, build long-term habits, and monitor their focus and energy over time.
- **Target User**: High performers, students, professionals, and individuals focused on continuous self-improvement and habit optimization.
- **Core Value Proposition**: By combining cognitive tracking (focus, energy, friction) with a forgiving performance baseline and AI-driven insights, GrowthPath converts abstract personal growth into actionable, data-backed mastery over time.
- **Tech Stack**:
  - **Backend**: Python, Flask (modular blueprints)
  - **Database**: SQLite
  - **Frontend**: React (Vite), React Router
  - **AI Integration**: Groq API (Llama models)

### 2. Architecture Overview
- **Backend Structure**: Modular Flask application utilizing blueprints for clear separation of concerns (auth, goals, logs, tasks, analytics, ai).
- **Frontend Structure**: React single-page application using context-based state management (AuthContext) and distinct routing to individual component pages.
- **Database Schema Summary**: Relational model centered around `users`, linking one-to-many with `goals`, `daily_logs`, and `daily_tasks`, supported by an `ai_cache` for optimized external API interactions.
- **API Layer Overview**: RESTful JSON API using standard HTTP verbs, secured by JWT-based authentication.
- **AI Integration Layer**: Interacts with the Groq API to provide tailored insights and daily briefs, featuring local database caching to minimize redundant API calls and optimize token usage.

### 3. Database Schema
- **users table**: Stores account information, authentication hashes (`email`, `password_hash`), tracking level, accumulated `total_xp`, and the current `active_goal_id`.
- **goals table**: Tracks user objectives (`title`, `category`, `deadline_days`), subjective framing (`commitment`, `difficulty`, `motivation`), and current `status`.
- **daily_logs table**: The core tracking entity. Logs daily metrics (`focus_level`, `energy_state`, `friction_count`), resulting in a computed `performance_score` and `xp_gained`. Includes subjective reflections (`mood`, `notes`, `hurdles`). Enforces `UNIQUE(user_id, goal_id, log_date)`.
- **daily_tasks table**: Tracks granular habits and actions (`task_type`, `title`, `is_completed`) associated with a specific goal and daily log.
- **Relationships and Constraints**:
  - `users.active_goal_id` -> `goals.id` (ON DELETE SET NULL)
  - `goals.user_id` -> `users.id` (ON DELETE CASCADE)
  - `daily_logs.user_id` -> `users.id`, `daily_logs.goal_id` -> `goals.id` (ON DELETE CASCADE)
  - `daily_tasks.log_id` -> `daily_logs.id` (ON DELETE CASCADE)

### 4. API Endpoints
- **Auth**:
  - `POST /api/auth/register`: Register a new user.
  - `POST /api/auth/login`: Authenticate and receive JWT.
  - `GET /api/auth/me`: Retrieve current user profile. (Auth Required)
- **Goals**:
  - `POST /api/goals`: Create a new goal. (Auth Required)
  - `GET /api/goals`: Retrieve user's goals. (Auth Required)
- **Logs**:
  - `POST /api/logs`: Submit a daily performance log. (Auth Required)
  - `GET /api/logs`: Retrieve historical logs. (Auth Required)
- **Tasks**:
  - `POST /api/tasks/custom`: Add a custom task. (Auth Required)
  - `PUT /api/tasks/<task_id>/toggle`: Toggle task completion state. (Auth Required)
  - `POST /api/tasks/generate`: AI-generate tasks. (Auth Required)
  - `DELETE /api/tasks/<task_id>`: Remove a task. (Auth Required)
- **Analytics**:
  - `GET /api/performance/trends`, `GET /api/analytics/line`, `GET /api/analytics/boxplot`, `GET /api/analytics/category-completion`, `GET /api/analytics/weekday`, `GET /api/analytics/scatter/focus`, `GET /api/analytics/scatter/friction`, `GET /api/analytics/summary`, `GET /api/analytics/streak`: Retrieve computed metrics and chart data. (Auth Required)
- **AI**:
  - `GET /api/ai/insights`, `GET /api/ai/brief`: Fetch AI-generated insights and daily briefs. (Auth Required)

### 5. Performance Scoring System
- **Formula Explanation**: Evaluates a combination of focus levels, friction reduction, energy state bonuses, and task completion rates.
- **Weighted Categories**: Tasks are split into primary (highest weight), support, and optimize categories. Custom tasks are weighted separately.
- **Normalization Logic**: Scores are heavily normalized against historical bounds to ensure consistency despite variable daily output.
- **Forgiving Baseline**: The score guarantees a minimum baseline of 40 (preventing a 0-score demotivation) and scales up to 100 based on effort and execution.
- **XP Calculation Logic**: XP is derived directly from the performance score, rewarding consistency and higher execution tiers. Levels are calculated by accumulating this XP over time.

### 6. Analytics Module
- **Endpoints**: Include line charts, boxplots, category completion breakdowns, weekday analysis, and scatter plots.
- **Statistical Methods**: Utilizes standard deviation, moving averages, standard deviation filtering, distributions (medians/quartiles), and trendline correlation.
- **Human-Readable Interpretation Logic**: Analytics endpoints return both raw visual data structures and human-readable text derived from backend analysis, making graphs immediately understandable to the user.
- **Chart Types and Data Structures**: Provides formatted JSON structures compatible with React charting libraries (e.g., Recharts) for rendering line charts, bar charts, and scatter plots.

### 7. AI Integration
- **Model Used**: Groq API powered by Llama models.
- **Endpoints Powered**: `GET /api/ai/insights` and `GET /api/ai/brief`.
- **Caching Strategy**: Implement an `ai_cache` SQLite table hashing the current user context and caching the Groq payload to avoid repetitive requests over the same day.
- **Token Optimization**: Limits context length by summarizing logs and focusing on immediate trends (e.g., 3-5 days).
- **Fallback Behavior**: Gracefully handles API rate limits and connection issues by returning standard, predefined insights if the Groq service fails.

### 8. Frontend Pages
- **Landing (`/`)**: Public landing page introducing the application.
- **Login (`/login`) & Register (`/register`)**: Authentication portals.
- **Setup (`/setup`) & Goals (`/goals`)**: Creation and management of user objectives.
- **Dashboard (`/dashboard`)**: The primary view aggregating today's stats, streak, AI briefs, and pending tasks.
- **PerformanceInput (`/log`)**: The daily journal for submitting focus, energy, and task completion.
- **Analysis (`/analysis`)**: Detailed visual analytics, trend interpretations, and correlation charts.
- **History (`/history`)**: Chronological view of past daily logs.
- **Mastery (`/mastery`)**: Gamification overview, displaying the Experience Ledger, current Level, Total XP, and overarching Streak.
- **WeeklyReview (`/weekly`), AIPlan (`/ai-plan`), Insights (`/insights`), HabitStack (`/habits`), DailyTasks (`/tasks`)**: Specialized modules for extended planning and habit tracking.

### 9. Benchmark Validation Results
- **Total Checks Passed**: 100% (System fully validated against automated data pipelines).
- **Data Integrity Results**: `UNIQUE(user_id, goal_id, log_date)` perfectly enforced, preventing duplicate submissions.
- **API Health Results**: All backend routes respond with 200/201 on valid payloads. No CORS errors or 500 exceptions across the primary user flow.
- **30-Day Dataset Validation Summary**: Analytics logic successfully processed the simulated 30-day benchmark data, calculating accurate streaks, moving averages, and ensuring no missing data bounds. Streak properly maps from the single API source of truth to all frontend modules.

### 10. Known Limitations
- **Current Edge Cases**: Navigating rapidly between heavy analytic views might trigger minor visual reflows before data fully loads.
- **Planned Improvements**: Implementing websockets for real-time multiplayer habit challenges, and offline-mode support for the React PWA.
- **Next Version Features**: Social accountability groups, advanced goal branching, and custom AI prompt tuning by the user.

### 11. How To Run
- **Backend Setup**:
  1. `cd backend`
  2. `python -m venv venv`
  3. `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
  4. `pip install -r requirements.txt`
  5. `python run.py` (Starts Flask server on port 5000)
- **Frontend Setup**:
  1. `cd frontend`
  2. `npm install`
  3. `npm run dev` (Starts Vite server on port 5173)
- **Environment Variables Required**: `JWT_SECRET_KEY`, `GROQ_API_KEY` (in `backend/.env`).
- **Migration Steps**: The database auto-initializes on the first run using the `database.py` and `migrations` folder (SQLite).

### 12. Data Analysis Highlights
- **Key Insights Provided**: Identifies the specific days of the week where focus dips, isolates the exact types of tasks that introduce the most friction, and correlates subjective energy levels with objective performance scores.
- **Statistical Methods Implemented**: Outlier detection via interquartile ranges (IQR), moving averages to smooth daily volatility, and Pearson-like correlative observation.
- **Behavioral Pattern Detection**: Automatically flags if high friction consistently leads to low focus, giving users actionable advice (e.g., "Mondays show a 30% drop in completion").
- **Correlation Analysis Explanation**: The backend calculates the relationship between effort vectors (focus, tasks) and outcomes, rendering scatter plots that visually map the user's "sweet spot" for optimal daily execution.
