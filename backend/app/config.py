import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
    OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY") or os.environ.get(
        "VITE_OPENROUTER_API_KEY"
    )

    # Logging
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

    # Supabase
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

    # Paths
    MD_FILES_DIR = os.path.join(BASE_DIR, "..", "..", "md_files")
    GENERATED_DOCS_DIR = os.path.join(BASE_DIR, "..", "instance", "generated_docs")
    TEMPLATE_DIR = os.path.join(BASE_DIR, "..", "templates")
    OUTPUT_DIR = os.path.join(BASE_DIR, "..", "instance", "generated_docs")
    INDEX_STORE_DIR = os.path.join(BASE_DIR, "..", "instance", "index_store")
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

    # LLM (Gemini for responses, OpenAI for embeddings)
    LLM_MODEL = "gemini-1.5-flash"
    EMBEDDING_MODEL = "text-embedding-3-small"
