# GrowthPath: AI-Powered Personal Growth Tracker

GrowthPath is a professional, minimalist personal goal tracking application designed for engineers and high-performers. It combines a clean, data-driven interface with AI-powered coaching to help you build consistency and achieve your ambitions.

## 🌟 Features
- **Multi-User Support**: Secure registration and login system with JWT authentication.
- **Goal Architecture**: Define complex goals with categories, deadlines, and daily commitments.
- **Daily Check-ins**: Log your logs, mood, and focus levels to track your evolution.
- **AI Coaching**: Personalized growth plans and motivational nudges powered by Groq (Llama 3.3).
- **Deep Analysis**: Visualize focus trends and consistency rings.
- **Minimalist UI**: Clean, professional design inspired by Linear, Stripe, and Notion.

---

## 🚀 Deployment Guide

This project is structured for a clean deployment using a Flask backend and a Vite+React frontend.

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API Key (for AI features)

### Backend Setup (Production)
1. **Environment Variables**: Create a `.env` file in the `backend/` directory based on `.env.template`.
   ```env
   SECRET_KEY=your_production_secret
   JWT_SECRET_KEY=your_jwt_secret
   GROQ_API_KEY=your_groq_key
   CORS_ORIGIN=https://your-frontend-domain.com
   DEBUG=False
   ```
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Initialize/Migrate Database**:
   ```bash
   python migrate.py
   ```
4. **Run with Gunicorn**:
   ```bash
   gunicorn --bind 0.0.0.0:5000 app:app
   ```

### Frontend Setup (Production)
1. **Configure API URL**: Update the fetch URLs in components to point to your production backend (using environment variables is recommended).
2. **Build for Production**:
   ```bash
   npm run build
   ```
3. **Host Static Assets**: Deploy the `dist/` folder to a service like Vercel, Netlify, or an S3 bucket.

---

## 🛠️ Tech Stack
- **Frontend**: React.js, Vite, Lucide-React, Recharts.
- **Backend**: Python, Flask, SQLite, Flask-JWT-Extended, Bcrypt.
- **AI**: Groq API (Llama-3.3-70b-versatile).
- **Styling**: Minimalist Vanilla CSS (Refined Typography & Grids).

## 🔒 Security
- Password hashing using `bcrypt`.
- Token-based authentication using `JWT`.
- Environment variable-based configuration.
- Proper CORS headers for cross-origin security.
- User-scoped data isolation in database queries.

---

## 🤝 Credits

This project was a high-intensity collaboration between:
- **Lead Developer**: [@notprasad](https://github.com/notprasad) — Vision, UI Design, and Product Strategy.
- **System Architect**: **Antigravity AI (Google Deepmind)** — Backend Logic, AI Integration, and Performance Optimization.

Together, we evolved this from a simple tracker into a comprehensive **Performance Lab**.

## 🏁 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
