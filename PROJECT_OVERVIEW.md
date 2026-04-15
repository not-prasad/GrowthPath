# GrowthPath: AI-Powered Personal Growth Tracker

## 🌟 Project Overview
GrowthPath is a premium, full-stack personal goal tracking application designed to help users stay motivated and organized. It combines modern web technologies with high-speed AI to provide a personalized coaching experience.

### Core Mission
To transform goal-setting from a static list into a dynamic, interactive journey using real-time AI feedback and data-driven insights.

---

## 🛠️ Technology Stack
*   **Frontend**: React.js (Vite), Recharts (Data Visualization), Lucide-React (Iconography).
*   **Backend**: Python (Flask), SQLite (Relational Database), Pandas (Data Processing).
*   **AI Engine**: Groq (Llama-3.3-70b-versatile) — chosen for near-instant inference and high-quality reasoning.
*   **Styling**: Vanilla CSS with a focus on Glassmorphism and a premium Dark Mode aesthetic.

---

## 🚀 Key Features
1.  **AI Motivational Nudges**: Real-time periodic coaching based on current streaks, mood, and completion rates.
2.  **AI Growth Plan**: Generates a realistic, week-by-week roadmap for any goal (e.g., Coding, Fitness, Language Learning).
3.  **Data Analytics**: Visualizes progress through interactive charts (daily logs vs. goal targets).
4.  **Daily Check-ins**: A dedicated logging system for tracking tasks, mood, and focus levels.
5.  **Clean UI/UX**: Deep purple aesthetic designed for high focus and a professional feel.

---

## ⚖️ Pros and Cons

### Pros
*   **Hyper-Fast Feedback**: AI responses return in under 1 second thanks to Groq.
*   **Data Persistence**: All goals and logs are saved in a local SQLite database.
*   **Clean Architecture**: Separation of concerns between a lightweight Flask API and a modular React frontend.
*   **Visual Clarity**: Use of Recharts makes progress tracking intuitive and rewarding.
*   **Privacy-First**: Designed as a local-first application with environment-variable security for API keys.

### Cons
*   **Local-Only**: Currently requires a local server to run; not deployed to a global cloud yet.
*   **Single User**: No multi-tenant support (shared local database).
*   **Manual Entry**: Relies on user honesty and manual logging rather than automated data sources (like Apple Health or GitHub APIs).

---

## 🗺️ Upcoming Features (Roadmap)
1.  **Smart Notifications**: Browser/Desktop alerts to remind users of their daily check-ins.
2.  **External Integrations**: Automatically sync progress from GitHub commits or Google Calendar.
3.  **Multi-Goal Support**: Ability to track and visualize multiple complex goals simultaneously.
4.  **Community Nudges**: Optional social features to share "streaks" and milestones with friends.
5.  **Mobile Companion**: A dedicated React Native application for logging on the go.
6.  **AI Voice Coaching**: Integration with Groq's upcoming multimodal features for vocal motivational check-ins.
