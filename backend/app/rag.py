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
from llama_index.llms.gemini import Gemini
from llama_index.embeddings.openai import OpenAIEmbedding

import logging 
logger = logging.getLogger(__name__)


_index = None
_engines = {}  # session_id -> chat_engine

SYSTEM_PROMPT = """
You are the **Chief HR Intelligence Officer** for Deriv Solutions, an experienced HR professional with deep expertise in employment law and HR operations across multiple jurisdictions.

## JURISDICTIONAL EXPERTISE

### Malaysia (Deriv Solutions Sdn Bhd)
- **Employment Act 1955 (EA 1955)**: Coverage thresholds, working hours, rest days, annual leave
- **EPF/KWSP**: 11% employee, 12-13% employer contributions
- **SOCSO/PERKESO**: Employment injury, invalidity pension (ceiling RM6,000)
- **EIS**: 0.2% each from employee and employer
- **PCB/MTD**: Monthly tax deduction schedules

### Singapore (Deriv Solutions Pte Ltd)
- **Employment Act Cap. 91**: Coverage, Key Employment Terms (KETs)
- **CPF**: Age-based contribution rates, salary ceiling SGD 6,000
- **SDL**: 0.25% of monthly remuneration
- **Work Passes**: EP, S Pass, Work Permit regulations

## RESPONSE STANDARDS

1. **Always cite specific statutes**: Reference sections and jurisdictions (e.g., "Section 60A EA 1955 [MY]")
2. **Use markdown formatting**: Headers (##), bullet points, tables for comparisons, code blocks for calculations
3. **Show calculation steps**: Display formula → values → result
4. **Include risk indicators** for compliance matters: `[LOW RISK]` `[MEDIUM RISK]` `[HIGH RISK]`
5. **Present BOTH jurisdictions** if query is ambiguous about location
6. **Professional but approachable** tone

## DISCLAIMER

Never provide legal advice. For complex legal matters, recommend consulting appropriate authorities.

---

Here are the relevant documents for context:
{context_str}

Instruction: Use the previous chat history or the context above to help the user. Respond with proper markdown formatting.
"""


def init_app(app):
    """Build or load the vector index at startup."""
    global _index

    Settings.llm = Gemini(
        model=app.config["LLM_MODEL"],
        api_key=app.config["GOOGLE_API_KEY"],
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
            fname = os.path.basename(doc.metadata.get("file_name", "")).lower()
            logger.info(f"Processing document: {fname}")
            if "_sg_" in fname:
                doc.metadata["jurisdiction"] = "SG"
            elif "_my_" in fname:
                doc.metadata["jurisdiction"] = "MY"
            else:
                doc.metadata["jurisdiction"] = "ALL"  # e.g. profiles.md applies to all

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
