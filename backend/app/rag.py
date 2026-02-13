# import json
# import os

# from llama_index.core import (
#     SimpleDirectoryReader,
#     StorageContext,
#     VectorStoreIndex,
#     load_index_from_storage,
#     Settings,
# )
# from llama_index.core.memory import ChatMemoryBuffer
# from llama_index.llms.openai import OpenAI
# from llama_index.embeddings.openai import OpenAIEmbedding

# import logging 
# logger = logging.getLogger(__name__)


# _index = None
# _engines = {}  # session_id -> chat_engine

# SYSTEM_PROMPT = """
# You are the **Chief HR Intelligence Officer** for Deriv Solutions, an experienced HR professional with deep expertise in employment law and HR operations across multiple jurisdictions.

# ## JURISDICTIONAL EXPERTISE

# ### Malaysia (Deriv Solutions Sdn Bhd)
# - **Employment Act 1955 (EA 1955)**: Coverage thresholds, working hours, rest days, annual leave
# - **EPF/KWSP**: 11% employee, 12-13% employer contributions
# - **SOCSO/PERKESO**: Employment injury, invalidity pension (ceiling RM6,000)
# - **EIS**: 0.2% each from employee and employer
# - **PCB/MTD**: Monthly tax deduction schedules

# ### Singapore (Deriv Solutions Pte Ltd)
# - **Employment Act Cap. 91**: Coverage, Key Employment Terms (KETs)
# - **CPF**: Age-based contribution rates, salary ceiling SGD 6,000
# - **SDL**: 0.25% of monthly remuneration
# - **Work Passes**: EP, S Pass, Work Permit regulations

# ## RESPONSE STANDARDS

# 1. **Always cite specific statutes**: Reference sections and jurisdictions (e.g., "Section 60A EA 1955 [MY]")
# 2. **Use markdown formatting**: Headers (##), bullet points, tables for comparisons, code blocks for calculations
# 3. **Show calculation steps**: Display formula → values → result
# 4. **Include risk indicators** for compliance matters: `[LOW RISK]` `[MEDIUM RISK]` `[HIGH RISK]`
# 5. **Present BOTH jurisdictions** if query is ambiguous about location
# 6. **Professional but approachable** tone

# ## DISCLAIMER

# Never provide legal advice. For complex legal matters, recommend consulting appropriate authorities.

# ---

# Here are the relevant documents for context:
# {context_str}

# Instruction: Use the previous chat history or the context above to help the user. Respond with proper markdown formatting.
# """


# def init_app(app):
#     """Build or load the vector index at startup."""
#     global _index

#     Settings.llm = OpenAI(
#         model=app.config["LLM_MODEL"],
#         api_key=app.config["OPENAI_API_KEY"],
#         temperature=0.1,
#     )
#     Settings.embed_model = OpenAIEmbedding(
#         model=app.config["EMBEDDING_MODEL"],
#         api_key=app.config["OPENAI_API_KEY"],
#     )

#     persist_dir = app.config["INDEX_STORE_DIR"]

#     if os.path.exists(persist_dir):
#         storage_context = StorageContext.from_defaults(persist_dir=persist_dir)
#         _index = load_index_from_storage(storage_context)
#     else:
#         documents = SimpleDirectoryReader(
#             app.config["MD_FILES_DIR"],
#             filename_as_id=True,
#         ).load_data()

#         for doc in documents:
#             fname = os.path.basename(doc.metadata.get("file_name", "")).lower()
#             logger.info(f"Processing document: {fname}")
#             if "_sg_" in fname:
#                 doc.metadata["jurisdiction"] = "SG"
#             elif "_my_" in fname:
#                 doc.metadata["jurisdiction"] = "MY"
#             else:
#                 doc.metadata["jurisdiction"] = "ALL"  # e.g. profiles.md applies to all

#         _index = VectorStoreIndex.from_documents(documents)
#         os.makedirs(persist_dir, exist_ok=True)
#         _index.storage_context.persist(persist_dir=persist_dir)


# def get_chat_engine(session_id):
#     """Get or create a chat engine for a session."""
#     if session_id not in _engines:
#         memory = ChatMemoryBuffer.from_defaults(token_limit=4000)
#         _engines[session_id] = _index.as_chat_engine(
#             chat_mode="condense_plus_context",
#             memory=memory,
#             context_prompt=SYSTEM_PROMPT,
#             similarity_top_k=5,
#             verbose=False,
#         )
#     return _engines[session_id]


# def _extract_sources(source_nodes):
#     """Extract citation info from source nodes."""
#     sources = []
#     seen = set()
#     for node in source_nodes or []:
#         fname = os.path.basename(node.metadata.get("file_name", "unknown"))
#         if fname in seen:
#             continue
#         seen.add(fname)
#         sources.append({
#             "file": fname,
#             "jurisdiction": node.metadata.get("jurisdiction", "Unknown"),
#             "score": round(node.score, 3) if node.score else None,
#             "snippet": node.text[:200] if node.text else "",
#         })
#     return sources


# def query(session_id, message):
#     """Non-streaming chat. Returns (response_text, sources)."""
#     engine = get_chat_engine(session_id)
#     response = engine.chat(message)
#     sources = _extract_sources(response.source_nodes)
#     return str(response), sources


# def stream_chat(session_id, message):
#     """Streaming chat. Yields token strings, then a final dict with sources."""
#     engine = get_chat_engine(session_id)
#     response = engine.stream_chat(message)

#     for token in response.response_gen:
#         yield token

#     sources = _extract_sources(response.source_nodes)
#     yield json.dumps({"type": "sources", "data": sources})


# def reset_session(session_id):
#     """Remove a session's chat engine."""
#     _engines.pop(session_id, None)


# def rebuild_index(app):
#     """Force rebuild the vector index."""
#     persist_dir = app.config["INDEX_STORE_DIR"]
#     if os.path.exists(persist_dir):
#         import shutil
#         shutil.rmtree(persist_dir)
#     init_app(app)



import json
import os
import importlib
import logging
logger = logging.getLogger(__name__)

from llama_index.core import (
    SimpleDirectoryReader,
    StorageContext,
    VectorStoreIndex,
    load_index_from_storage,
    Settings,
)
from llama_index.core.memory import ChatMemoryBuffer

# keep your existing Llama OpenAI classes import for the "happy path"
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

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

# --- Helper: try multiple import candidates for Gemini/Google LLMs/Embeddings ---
def try_dynamic_import(candidates):
    """
    candidates: list of tuples (module_path, class_name)
    returns: (class_obj, module_path, class_name) or (None, None, None)
    """
    for module_path, class_name in candidates:
        try:
            mod = importlib.import_module(module_path)
            cls = getattr(mod, class_name, None)
            if cls is not None:
                logger.info(f"Imported {class_name} from {module_path}")
                return cls, module_path, class_name
        except Exception as e:
            logger.debug(f"Failed import attempt {module_path}.{class_name}: {e}")
    return None, None, None

# Candidate names: extend these if your environment exposes a different wrapper
GEMINI_LLM_CANDIDATES = [
    ("llama_index.llms.google_gemini", "GoogleGemini"),
    ("llama_index.llms.google_palm", "GooglePalm"),
    ("llama_index.llms.google_bard", "GoogleBard"),
    ("llama_index.llms.gemini", "Gemini"),
]

GEMINI_EMBED_CANDIDATES = [
    ("llama_index.embeddings.google_embeddings", "GoogleEmbedding"),
    ("llama_index.embeddings.gemini_embedding", "GeminiEmbedding"),
    ("llama_index.embeddings.google_palm", "GooglePalmEmbedding"),
]

def init_openai_models(app):
    """
    Try to set OpenAI LLM + embeddings into Settings.
    Will raise exception if the underlying LlamaIndex OpenAI wrapper raises during use.
    """
    Settings.llm = OpenAI(
        model=app.config["LLM_MODEL"],
        api_key=app.config.get("OPENAI_API_KEY"),
        temperature=0.1,
    )
    Settings.embed_model = OpenAIEmbedding(
        model=app.config.get("EMBEDDING_MODEL"),
        api_key=app.config.get("OPENAI_API_KEY"),
    )
    logger.info("Configured OpenAI LLM + OpenAI embeddings (tentatively).")

def init_gemini_models(app):
    """
    Try to find Gemini-compatible LLM and embedding wrappers and configure Settings.
    Raises RuntimeError if no suitable classes are found.
    """
    gemini_api_key = app.config.get("GEMINI_API_KEY")
    if not gemini_api_key:
        raise RuntimeError("No GEMINI_API_KEY found in app.config")

    LLM_cls, llm_module, llm_name = try_dynamic_import(GEMINI_LLM_CANDIDATES)
    EMB_cls, emb_module, emb_name = try_dynamic_import(GEMINI_EMBED_CANDIDATES)

    if LLM_cls is None:
        raise RuntimeError(
            "Could not find a Gemini LLM wrapper in llama_index. "
            "Checked: " + ", ".join(f"{m}.{c}" for m, c in GEMINI_LLM_CANDIDATES)
        )

    # Embeddings are optional — if not found we keep Settings.embed_model as None and
    # let VectorStoreIndex/from_documents raise if embeddings are required.
    if EMB_cls is None:
        logger.warning(
            "Could not find a Gemini embedding wrapper; attempting to proceed with Gemini LLM only."
        )

    # Instantiate using common arg names — if your wrapper expects different params, adapt here
    try:
        # Common param names for Google wrappers often: model, api_key, temperature
        Settings.llm = LLM_cls(model=app.config.get("LLM_MODEL"), api_key=gemini_api_key, temperature=0.1)
        logger.info(f"Configured Gemini LLM using {llm_module}.{llm_name}")
    except TypeError:
        # try alternative constructor signature if the wrapper uses 'api_key' named differently
        Settings.llm = LLM_cls(api_key=gemini_api_key)
        logger.info(f"Configured Gemini LLM using fallback constructor for {llm_module}.{llm_name}")

    if EMB_cls:
        try:
            Settings.embed_model = EMB_cls(model=app.config.get("EMBEDDING_MODEL"), api_key=gemini_api_key)
            logger.info(f"Configured Gemini embedding using {emb_module}.{emb_name}")
        except Exception as e:
            logger.warning(f"Failed to instantiate Gemini embedding wrapper: {e}. Proceeding without it.")
            Settings.embed_model = None

def _build_or_load_index(app, persist_dir):
    """
    Encapsulates the logic for building or loading index.
    Raises any exceptions that occur so caller can decide on fallback behavior.
    """
    global _index

    if os.path.exists(persist_dir):
        storage_context = StorageContext.from_defaults(persist_dir=persist_dir)
        _index = load_index_from_storage(storage_context)
        logger.info(f"Loaded index from {persist_dir}")
        return

    # not persisted -> load docs and build
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
            doc.metadata["jurisdiction"] = "ALL"

    # This is the step that typically triggers embedding/LLM calls and thus auth errors.
    _index = VectorStoreIndex.from_documents(documents)
    os.makedirs(persist_dir, exist_ok=True)
    _index.storage_context.persist(persist_dir=persist_dir)
    logger.info(f"Built and persisted new index to {persist_dir}")

def init_app(app):
    """Robust startup: try OpenAI first, fall back to Gemini if OpenAI auth fails."""
    global _index

    persist_dir = app.config["INDEX_STORE_DIR"]
    openai_key = app.config.get("OPENAI_API_KEY")
    gemini_key = app.config.get("GEMINI_API_KEY")

    # Try OpenAI first (happy path)
    if openai_key:
        try:
            logger.info("Attempting to initialize OpenAI-based LLM/embeddings...")
            init_openai_models(app)

            # Build/load index using the configured Settings.* objects.
            _build_or_load_index(app, persist_dir)
            logger.info("Index build/load succeeded using OpenAI.")
            return  # success: we are done

        except Exception as e:
            logger.exception("OpenAI initialization or index build failed: %s", e)
            # Inspect message to detect an authentication error
            msg = str(e).lower()
            if ("invalid_api_key" in msg) or ("incorrect api key" in msg) or ("401" in msg) or ("authentication" in msg):
                logger.warning("Detected OpenAI auth error; will attempt to fall back to Gemini (if available).")
            else:
                # For non-auth errors we still might want to try Gemini, but log the exception first.
                logger.warning("OpenAI failed for reasons other than auth; still attempting Gemini fallback if present.")
    else:
        logger.warning("No OPENAI_API_KEY configured; will attempt Gemini fallback if available.")

    # If we reach here, attempt Gemini fallback (if GEMINI_API_KEY is present)
    if gemini_key:
        try:
            logger.info("Attempting to initialize Gemini-based LLM/embeddings...")
            init_gemini_models(app)

            # Try to build/load index again using Gemini settings
            _build_or_load_index(app, persist_dir)
            logger.info("Index build/load succeeded using Gemini.")
            return  # success: done

        except Exception as e:
            logger.exception("Gemini initialization or index build failed: %s", e)
            raise RuntimeError(
                "Both OpenAI and Gemini attempts failed. See logs for details. "
                "If you have a working API key for either provider, ensure it's in app.config "
                "as OPENAI_API_KEY or GEMINI_API_KEY and the corresponding connector is installed."
            ) from e

    # No gemini key or both attempts failed
    raise RuntimeError(
        "RAG initialization failed: no working OPENAI_API_KEY and no GEMINI_API_KEY fallback succeeded. "
        "Check your keys and connectors. See logs for details."
    )

# # --- The rest of your code remains unchanged ---
# def get_chat_engine(session_id):
#     """Get or create a chat engine for a session."""
#     if session_id not in _engines:
#         memory = ChatMemoryBuffer.from_defaults(token_limit=4000)
#         _engines[session_id] = _index.as_chat_engine(
#             chat_mode="condense_plus_context",
#             memory=memory,
#             context_prompt=SYSTEM_PROMPT,
#             similarity_top_k=5,
#             verbose=False,
#         )
#     return _engines[session_id]

def _is_auth_error(exc: Exception) -> bool:
    """Return True if the exception looks like an API key / 401 auth failure."""
    msg = str(exc).lower()
    return any(kw in msg for kw in ("401", "invalid_api_key", "incorrect api key", "authentication", "unauthorized"))


def _switch_to_gemini() -> bool:
    """
    Attempt to reconfigure Settings to use Gemini at runtime.
    Returns True on success, False if GEMINI_API_KEY is absent or init fails.
    """
    from flask import current_app
    try:
        app_obj = current_app._get_current_object()
        gemini_key = app_obj.config.get("GEMINI_API_KEY")
        if not gemini_key:
            logger.warning("Runtime Gemini fallback requested but GEMINI_API_KEY is not set.")
            return False
        init_gemini_models(app_obj)
        logger.info("Runtime switch to Gemini succeeded.")
        return True
    except Exception as e:
        logger.error("Runtime switch to Gemini failed: %s", e)
        return False


def get_chat_engine(session_id):
    """Get or create a chat engine for a session."""
    global _engines

    if session_id in _engines:
        return _engines[session_id]

    memory = ChatMemoryBuffer.from_defaults(token_limit=4000)
    engine = _index.as_chat_engine(
        chat_mode="condense_plus_context",
        memory=memory,
        context_prompt=SYSTEM_PROMPT,
        similarity_top_k=5,
        verbose=False,
    )
    _engines[session_id] = engine
    return engine




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
    """
    Non-streaming chat. Returns (response_text, sources).
    If the active LLM returns a 401/auth error, attempts a one-time runtime
    switch to Gemini and retries before raising.
    """
    engine = get_chat_engine(session_id)
    try:
        response = engine.chat(message)
    except Exception as e:
        if _is_auth_error(e) and _switch_to_gemini():
            # Drop the stale engine (it was built with old Settings) and retry
            _engines.pop(session_id, None)
            engine = get_chat_engine(session_id)
            response = engine.chat(message)
        else:
            raise
    sources = _extract_sources(response.source_nodes)
    return str(response), sources


def stream_chat(session_id, message):
    """
    Streaming chat. Yields token strings, then a final dict with sources.
    Falls back to Gemini on 401 and retries (non-streaming) to avoid partial output.
    """
    engine = get_chat_engine(session_id)
    try:
        response = engine.stream_chat(message)
        for token in response.response_gen:
            yield token
        sources = _extract_sources(response.source_nodes)
        yield json.dumps({"type": "sources", "data": sources})
    except Exception as e:
        if _is_auth_error(e) and _switch_to_gemini():
            _engines.pop(session_id, None)
            # Fall back to non-streaming after provider switch to keep it simple
            text, sources = query(session_id, message)
            yield text
            yield json.dumps({"type": "sources", "data": sources})
        else:
            raise


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
