import os
from flask import Flask
from flask_cors import CORS
from .config import Config
from .routes import api_bp, ai_bp, code_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]}})

    app.register_blueprint(api_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(code_bp)
    return app