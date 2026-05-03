from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from backend.config import Config
from .database import init_db, apply_migrations
from .utils.errors import register_error_handlers
from .routes.auth import bp as auth_bp
from .routes.goals import bp as goals_bp
from .routes.logs import bp as logs_bp
from .routes.tasks import bp as tasks_bp
from .routes.analytics import bp as analytics_bp
from .routes.ai import bp as ai_bp
from .routes.habits import bp as habits_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = Config.SECRET_KEY
    app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = getattr(Config, "JWT_ACCESS_TOKEN_EXPIRES", 3600)

    # Extensions
    JWTManager(app)
    cors_origins = getattr(Config, "CORS_ORIGIN", "*")
    CORS(app, resources={r"/api/*": {"origins": cors_origins}})

    # DB bootstrap (v2 only)
    init_db()
    apply_migrations()

    # Error handling
    register_error_handlers(app)

    # Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(goals_bp)
    app.register_blueprint(logs_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(habits_bp)

    return app

