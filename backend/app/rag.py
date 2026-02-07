import json
import os

from llama_index.core import (
    SimpleDirectoryReader,
    StorageContext,
    VectorStoreIndex,
    load_index_from_storage,
    Settings,
)
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

_index = None
_engines = {}  # session_id -> chat_engine

SYSTEM_PROMPT = (
    "You are an HR assistant for Deriv Solutions. "
    "You help employees with HR policy questions across two offices:\n"
    "- Malaysia: Deriv Solutions Sdn Bhd (Employment Act 1955, EPF/SOCSO, RM currency)\n"
    "- Singapore: Deriv Solutions Pte Ltd (Employment Act Cap. 91, CPF, SGD currency)\n\n"
    "Always cite which policy document and jurisdiction (MY or SG) your answer comes from. "
    "If the employee's jurisdiction is unclear, present information for both offices. "
    "Be concise, accurate, and helpful. Do not provide legal advice.\n\n"
    "Here are the relevant documents for context:\n{context_str}\n\n"
    "Instruction: Use the previous chat history or the context above to help the user."
)


def init_app(app):
    """Build or load the vector index at startup."""
    global _index

    Settings.llm = OpenAI(
        model=app.config["LLM_MODEL"],
        api_key=app.config["OPENAI_API_KEY"],
        temperature=0.1,
    )
    Settings.embed_model = OpenAIEmbedding(
        model=app.config["EMBEDDING_MODEL"],
        api_key=app.config["OPENAI_API_KEY"],
    )

    persist_dir = app.config["INDEX_STORE_DIR"]

    if os.path.exists(persist_dir):
        storage_context = StorageContext.from_defaults(persist_dir=persist_dir)
        _index = load_index_from_storage(storage_context)
    else:
        documents = SimpleDirectoryReader(
            app.config["MD_FILES_DIR"],
            filename_as_id=True,
        ).load_data()

        for doc in documents:
            fname = os.path.basename(doc.metadata.get("file_name", ""))
            doc.metadata["jurisdiction"] = "SG" if "_sg_" in fname.lower() else "MY"

        _index = VectorStoreIndex.from_documents(documents)
        os.makedirs(persist_dir, exist_ok=True)
        _index.storage_context.persist(persist_dir=persist_dir)


def get_chat_engine(session_id):
    """Get or create a chat engine for a session."""
    if session_id not in _engines:
        memory = ChatMemoryBuffer.from_defaults(token_limit=4000)
        _engines[session_id] = _index.as_chat_engine(
            chat_mode="condense_plus_context",
            memory=memory,
            context_prompt=SYSTEM_PROMPT,
            similarity_top_k=5,
            verbose=False,
        )
    return _engines[session_id]


def _extract_sources(source_nodes):
    """Extract citation info from source nodes."""
    sources = []
    seen = set()
    for node in source_nodes or []:
        fname = os.path.basename(node.metadata.get("file_name", "unknown"))
        if fname in seen:
            continue
        seen.add(fname)
        sources.append({
            "file": fname,
            "jurisdiction": node.metadata.get("jurisdiction", "Unknown"),
            "score": round(node.score, 3) if node.score else None,
            "snippet": node.text[:200] if node.text else "",
        })
    return sources


def query(session_id, message):
    """Non-streaming chat. Returns (response_text, sources)."""
    engine = get_chat_engine(session_id)
    response = engine.chat(message)
    sources = _extract_sources(response.source_nodes)
    return str(response), sources


def stream_chat(session_id, message):
    """Streaming chat. Yields token strings, then a final dict with sources."""
    engine = get_chat_engine(session_id)
    response = engine.stream_chat(message)

    for token in response.response_gen:
        yield token

    sources = _extract_sources(response.source_nodes)
    yield json.dumps({"type": "sources", "data": sources})


def reset_session(session_id):
    """Remove a session's chat engine."""
    _engines.pop(session_id, None)


def rebuild_index(app):
    """Force rebuild the vector index."""
    persist_dir = app.config["INDEX_STORE_DIR"]
    if os.path.exists(persist_dir):
        import shutil
        shutil.rmtree(persist_dir)
    init_app(app)
