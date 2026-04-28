import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-secret-key-change-me")
    DB_FILE = os.environ.get("DB_FILE", os.path.join(BASE_DIR, "growthpath.db"))
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
    CORS_ORIGIN = os.environ.get("CORS_ORIGIN", "http://localhost:5173")
    DEBUG = os.environ.get("DEBUG", "True").lower() == "true"
