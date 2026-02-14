import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

# Load .env from backend directory
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)


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

    # HR Agent
    from app import hr_agent

    hr_agent.init_hr_agent(app)

    # Blueprints
    from app.routes import (
        chat,
        documents,
        onboarding,
        hr_agent as hr_agent_routes,
        auth,
        contract_sign,
    )
    from app.routes import onboarding_workflow
    from app.routes import multiagent_onboarding
    from app.routes import training

    app.register_blueprint(chat.bp)
    app.register_blueprint(documents.bp)
    app.register_blueprint(documents.onboarding_docs_bp)
    app.register_blueprint(onboarding.bp)
    app.register_blueprint(hr_agent_routes.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(contract_sign.bp)
    app.register_blueprint(onboarding_workflow.bp)
    app.register_blueprint(multiagent_onboarding.bp)
    app.register_blueprint(training.bp)

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
