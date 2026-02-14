import os
from supabase import create_client, Client
from flask import g, current_app

def get_db() -> Client:
    """
    Returns the Supabase client.
    """
    if "supabase" not in g:
        url = current_app.config.get("SUPABASE_URL")
        key = current_app.config.get("SUPABASE_KEY")
        
        if not url or not key:
            raise RuntimeError("Supabase URL and Key must be set in configuration.")
            
        g.supabase = create_client(url, key)
        
    return g.supabase

def close_db(e=None):
    """
    Closes the database connection.
    For Supabase (REST), there isn't a persistent connection to close in the same way as SQLite,
    but we clear the global context.
    """
    g.pop("supabase", None)

def init_app(app):
    """
    Register database functions with the Flask app.
    """
    app.teardown_appcontext(close_db)
    # No init_db needed as we use Supabase cloud
