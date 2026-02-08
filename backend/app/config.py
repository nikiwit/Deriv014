import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
    GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

    # Database
    DATABASE = os.path.join(BASE_DIR, "..", "instance", "hr_platform.sqlite")

    # Paths
    MD_FILES_DIR = os.path.join(BASE_DIR, "..", "..", "md_files")
    GENERATED_DOCS_DIR = os.path.join(BASE_DIR, "..", "instance", "generated_docs")
    TEMPLATE_DIR = os.path.join(BASE_DIR, "..", "templates")
    OUTPUT_DIR = os.path.join(BASE_DIR, "..", "instance", "generated_docs")
    INDEX_STORE_DIR = os.path.join(BASE_DIR, "..", "instance", "index_store")

    # LLM (Gemini for responses, OpenAI for embeddings)
    LLM_MODEL = "models/gemini-2.5-flash"
    EMBEDDING_MODEL = "text-embedding-3-small"
