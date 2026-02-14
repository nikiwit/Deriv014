import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
    OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY") or os.environ.get(
        "VITE_OPENROUTER_API_KEY"
    )

    # Database Mode: 'local' (PostgreSQL Docker) or 'supabase' (cloud)
    # Default: 'supabase' for production, override with LOCAL_DB_MODE=local for dev
    DB_MODE = os.environ.get("DB_MODE", "supabase")

    # Supabase (Production)
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

    # Local PostgreSQL (Development)
    LOCAL_DATABASE_URL = os.environ.get(
        "LOCAL_DATABASE_URL",
        "postgresql://derivhr:derivhr_dev_password@localhost:5432/derivhr_dev",
    )

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

    # Onboarding Settings
    ONBOARDING_DUE_DAYS_DEFAULT = int(os.environ.get("ONBOARDING_DUE_DAYS_DEFAULT", 30))
    ONBOARDING_REMINDER_DAYS = int(os.environ.get("ONBOARDING_REMINDER_DAYS", 3))
