from dotenv import load_dotenv
from flask import Flask

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

from app import rag

load_dotenv()

flask_app = Flask(__name__)

from app.config import Config
flask_app.config.from_object(Config)

with flask_app.app_context():
    rag.init_app(flask_app)

print("✅ RAG initialized for Slack")

slack_app = App(token=os.getenv("SLACK_BOT_TOKEN")) 

@slack_app.message("")
def handle_message(message, say):
    text = message.get("text", "").strip()
    if not text:
        return

    session_id = message.get("user", "slack")

    response, _ = rag.query(session_id, text)
    say(response)

if __name__ == "__main__":
    print("🤖 Slack bot running (Socket Mode)")
    SocketModeHandler(
        slack_app,
        os.getenv("SLACK_APP_TOKEN")
    ).start()
