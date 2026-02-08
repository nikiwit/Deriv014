import json
import uuid

from flask import Blueprint, Response, jsonify, request, stream_with_context

from app import rag
from app.database import get_db

bp = Blueprint("chat", __name__, url_prefix="/api/chat")


def _ensure_session(session_id, jurisdiction=None):
    """Create session in DB if it doesn't exist. Returns session_id."""
    if not session_id:
        session_id = str(uuid.uuid4())
    db = get_db()
    existing = db.execute("SELECT id FROM chat_sessions WHERE id = ?", (session_id,)).fetchone()
    if not existing:
        db.execute(
            "INSERT INTO chat_sessions (id, jurisdiction) VALUES (?, ?)",
            (session_id, jurisdiction),
        )
        db.commit()
    return session_id


def _save_message(session_id, role, content, sources=None):
    """Persist a message to the database."""
    db = get_db()
    db.execute(
        "INSERT INTO chat_messages (session_id, role, content, sources) VALUES (?, ?, ?, ?)",
        (session_id, role, content, json.dumps(sources) if sources else None),
    )
    db.execute(
        "UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (session_id,),
    )
    db.commit()


@bp.route("", methods=["POST"])
def chat():
    """Non-streaming chat endpoint."""
    data = request.get_json()
    if not data or not data.get("message"):
        return jsonify({"error": "Message is required"}), 400

    message = data["message"]
    session_id = _ensure_session(data.get("session_id"), data.get("jurisdiction"))

    _save_message(session_id, "user", message)

    try:
        response_text, sources = rag.query(session_id, message)
    except Exception as e:
        return jsonify({"error": f"RAG engine error: {str(e)}"}), 500

    _save_message(session_id, "assistant", response_text, sources)

    return jsonify({
        "session_id": session_id,
        "response": response_text,
        "sources": sources,
    })


@bp.route("/stream", methods=["POST"])
def stream():
    """SSE streaming chat endpoint."""
    data = request.get_json()
    if not data or not data.get("message"):
        return jsonify({"error": "Message is required"}), 400

    message = data["message"]
    session_id = _ensure_session(data.get("session_id"), data.get("jurisdiction"))

    _save_message(session_id, "user", message)

    def generate():
        full_response = []
        sources = []
        try:
            for chunk in rag.stream_chat(session_id, message):
                if isinstance(chunk, str) and chunk.startswith('{"type":'):
                    # Final sources payload
                    parsed = json.loads(chunk)
                    sources = parsed.get("data", [])
                    yield f"data: {json.dumps({'done': True, 'sources': sources})}\n\n"
                else:
                    full_response.append(chunk)
                    yield f"data: {json.dumps({'token': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        # Save complete response to DB
        _save_message(session_id, "assistant", "".join(full_response), sources)

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Session-Id": session_id,
        },
    )


@bp.route("/history/<session_id>", methods=["GET"])
def history(session_id):
    """Get conversation history for a session."""
    db = get_db()
    messages = db.execute(
        "SELECT role, content, sources, created_at FROM chat_messages "
        "WHERE session_id = ? ORDER BY created_at",
        (session_id,),
    ).fetchall()

    return jsonify({
        "session_id": session_id,
        "messages": [
            {
                "role": m["role"],
                "content": m["content"],
                "sources": json.loads(m["sources"]) if m["sources"] else [],
                "created_at": m["created_at"],
            }
            for m in messages
        ],
    })


@bp.route("/agent", methods=["POST"])
def agent_chat():
    """
    Agent-routed chat endpoint.

    Routes queries to specialized HR agents based on intent classification.
    Returns response with agent metadata and source citations.
    """
    from app.agents import AgentOrchestrator

    data = request.get_json()
    if not data or not data.get("message"):
        return jsonify({"error": "Message is required"}), 400

    message = data["message"]
    session_id = _ensure_session(data.get("session_id"), data.get("jurisdiction"))
    employee_context = data.get("employee_context")

    _save_message(session_id, "user", message)

    try:
        # Get orchestrator and process query
        orchestrator = AgentOrchestrator()
        engine = rag.get_chat_engine(session_id)

        result = orchestrator.process_query(
            session_id=session_id,
            query=message,
            rag_engine=engine,
            jurisdiction=data.get("jurisdiction"),
            employee_context=employee_context
        )
    except Exception as e:
        return jsonify({"error": f"Agent error: {str(e)}"}), 500

    _save_message(session_id, "assistant", result["response"], result["sources"])

    return jsonify({
        "session_id": session_id,
        "response": result["response"],
        "sources": result["sources"],
        "agent_used": result["agent_used"],
        "confidence": result["confidence"],
        "jurisdiction": result["jurisdiction"],
        "routing_reason": result.get("routing_reason", ""),
    })
