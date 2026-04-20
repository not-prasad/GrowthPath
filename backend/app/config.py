import os


class AppConfig:
    """
    v2 backend configuration values.
    Prefer using backend/config.py for environment wiring; this file is for app-local defaults.
    """

    DEFAULT_LOG_LIMIT = int(os.getenv("DEFAULT_LOG_LIMIT", "365"))
    MAX_LOG_LIMIT = int(os.getenv("MAX_LOG_LIMIT", "5000"))
    DEFAULT_TRENDS_DAYS = int(os.getenv("DEFAULT_TRENDS_DAYS", "7"))

