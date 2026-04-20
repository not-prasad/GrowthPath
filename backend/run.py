import os
import sys

# Allow running from either:
# - repo root:   python backend/run.py
# - backend dir: python run.py
if __package__ is None:
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    sys.path.insert(0, workspace_root)

from backend.app import create_app  # noqa: E402
from backend.config import Config  # noqa: E402


app = create_app()


if __name__ == "__main__":
    # Use backend/config.py Config.DEBUG via Flask envs; default binds to localhost.
    app.run(port=5000, debug=bool(getattr(Config, "DEBUG", False)))

