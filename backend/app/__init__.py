import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

load_dotenv()


def create_app():
    app = Flask(__name__, instance_relative_config=True)

    # Load config
    from app.config import Config
    app.config.from_object(Config)

    # Ensure instance directory exists
    os.makedirs(app.instance_path, exist_ok=True)
    os.makedirs(app.config["GENERATED_DOCS_DIR"], exist_ok=True)

    # CORS
    CORS(app)

    # Database
    from app import database
    database.init_app(app)

    # RAG engine
    from app import rag
    rag.init_app(app)

    #Blueprints #original
    from app.routes import chat, documents, onboarding
    app.register_blueprint(chat.bp)
    app.register_blueprint(documents.bp)
    app.register_blueprint(onboarding.bp)

    # # Blueprints
    # from app.routes import chat, documents, onboarding, slack

    # app.register_blueprint(chat.bp)
    # app.register_blueprint(documents.bp)
    # app.register_blueprint(onboarding.bp)
    # app.register_blueprint(slack.bp)


    # Health check
    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok", "rag_loaded": rag._index is not None})

    return app
