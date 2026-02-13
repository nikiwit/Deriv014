from dotenv import load_dotenv

load_dotenv()

from app import create_app

app = create_app()
from flask import Flask
from app.routes.documents import bp as documents_bp
from flask_cors import CORS

# app = Flask(__name__)
# CORS(app)  # allow all origins in dev; lock down in production

# app.register_blueprint(documents_bp)

if __name__ == "__main__":
    app.run(debug=True, port=5001)
