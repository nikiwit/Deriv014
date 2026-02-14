import json
import uuid
import datetime

from flask import Blueprint, Response, jsonify, request, stream_with_context

from app import rag
from app.database import get_db

bp = Blueprint("chat", __name__, url_prefix="/api/chat")


def _ensure_session(session_id, jurisdiction=None):
    """Create session in DB if it doesn't exist. Returns session_id."""
    if not session_id:
        session_id = str(uuid.uuid4())
    
    db = get_db()
    # Check if exists
    existing = db.table("chat_sessions").select("id").eq("id", session_id).execute()
    
    if not existing.data:
        db.table("chat_sessions").insert({
            "id": session_id,
            "jurisdiction": jurisdiction,
            "updated_at": datetime.datetime.now().isoformat()
        }).execute()
        
    return session_id


def _save_message(session_id, role, content, sources=None):
    """Persist a message to the database."""
    db = get_db()
    
    db.table("chat_messages").insert({
        "session_id": session_id,
        "role": role,
        "content": content,
        "sources": json.dumps(sources) if sources else None
    }).execute()
    
    # Update session timestamp
    db.table("chat_sessions").update({
        "updated_at": datetime.datetime.now().isoformat()
    }).eq("id", session_id).execute()


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
                # RAG stream might yield strings or objects
                # Assuming chunk is string token for now, but original code had logic for sources
                if isinstance(chunk, str) and chunk.startswith('{"type":'):
                    try:
                        parsed = json.loads(chunk)
                        sources = parsed.get("data", [])
                        yield f"data: {json.dumps({'done': True, 'sources': sources})}\n\n"
                    except:
                         yield f"data: {json.dumps({'token': chunk})}\n\n"
                elif isinstance(chunk, dict) and chunk.get("sources"):
                     sources = chunk.get("sources")
                     yield f"data: {json.dumps({'done': True, 'sources': sources})}\n\n"
                else:
                    full_response.append(str(chunk))
                    yield f"data: {json.dumps({'token': str(chunk)})}\n\n"
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
    
    response = db.table("chat_messages").select("role, content, sources, created_at").eq("session_id", session_id).order("created_at").execute()
    
    messages = []
    for m in response.data:
        sources_data = []
        if m.get("sources"):
            try:
                sources_data = json.loads(m["sources"])
            except:
                sources_data = []
                
        messages.append({
            "role": m["role"],
            "content": m["content"],
            "sources": sources_data,
            "created_at": m["created_at"],
        })

    return jsonify({
        "session_id": session_id,
        "messages": messages
    })


@bp.route("/agent", methods=["POST"])
def agent_chat():
    """
    Agent-routed chat endpoint.
    Routes queries to specialized HR agents based on intent classification.
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
        # Mock engine or real engine
        engine = rag.get_chat_engine(session_id)

        result = orchestrator.process_query(
            session_id=session_id,
            query=message,
            rag_engine=engine,
            jurisdiction=data.get("jurisdiction"),
            employee_context=employee_context
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
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
