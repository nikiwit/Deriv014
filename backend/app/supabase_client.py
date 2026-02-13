import os
from supabase import create_client

_client = None


def get_supabase():
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY environment variables are required")
        _client = create_client(url, key)
    return _client
