"""
Dual Database Support: Local PostgreSQL (dev) / Supabase (prod)
Automatically switches based on DB_MODE environment variable
"""

import os
import json
from supabase import create_client, Client
from flask import g, current_app
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager

# Import SQLAlchemy models
from app.models_sqlalchemy import (
    Base,
    DatabaseManager,
    Employee,
    OnboardingState,
    OnboardingTaskDefinition,
    TaskDependency,
    OnboardingTaskProgress,
    OnboardingDocument,
    OnboardingForm,
    OnboardingFeedback,
    OnboardingBadge,
)


def get_supabase_db() -> Client:
    """Returns the Supabase client (production)"""
    if "supabase" not in g:
        url = current_app.config.get("SUPABASE_URL")
        key = current_app.config.get("SUPABASE_KEY")

        if not url or not key:
            raise RuntimeError("Supabase URL and Key must be set in configuration.")

        g.supabase = create_client(url, key)

    return g.supabase


def get_local_db() -> Session:
    """Returns a local PostgreSQL session (development)"""
    if "local_db" not in g:
        default_url = (
            "postgresql://derivhr:derivhr_dev_password@localhost:5432/derivhr_dev"
        )
        config_url = current_app.config.get("LOCAL_DATABASE_URL")
        db_url = str(config_url) if config_url else default_url
        engine = create_engine(db_url, pool_pre_ping=True)
        Session = sessionmaker(bind=engine)
        g.local_db = Session()

    return g.local_db


def get_db():
    """
    Main database accessor - switches between Supabase and Local PostgreSQL
    based on DB_MODE config.
    """
    db_mode = current_app.config.get("DB_MODE", "supabase")

    if db_mode == "local":
        return get_local_db()
    else:
        return get_supabase_db()


def get_db_mode():
    """Returns current database mode"""
    return os.environ.get("DB_MODE", "supabase")


def is_local_mode():
    """Check if running in local PostgreSQL mode"""
    return get_db_mode() == "local"


def is_supabase_mode():
    """Check if running in Supabase mode"""
    return get_db_mode() == "supabase"


def close_db(e=None):
    """Closes database connections"""
    # Close Supabase connection
    g.pop("supabase", None)

    # Close local PostgreSQL session
    if "local_db" in g:
        g.local_db.close()
        g.pop("local_db", None)


def init_local_database():
    """Initialize local PostgreSQL with tables and seed data"""
    DatabaseManager.init_local_db()
    DatabaseManager.seed_default_tasks()


def check_local_db_connection() -> bool:
    """Check if local PostgreSQL is available"""
    try:
        db_url = os.environ.get(
            "LOCAL_DATABASE_URL",
            "postgresql://derivhr:derivhr_dev_password@localhost:5432/derivhr_dev",
        )
        engine = create_engine(db_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"Local PostgreSQL connection failed: {e}")
        return False


def init_app(app):
    """
    Register database functions with the Flask app.
    Automatically handles both Supabase and local PostgreSQL.
    """
    app.teardown_appcontext(close_db)

    # Check which DB to use based on config
    db_mode = app.config.get("DB_MODE", "supabase")

    if db_mode == "local":
        # Initialize local PostgreSQL
        with app.app_context():
            try:
                init_local_database()
                print("✅ Local PostgreSQL initialized with onboarding tables")
            except Exception as e:
                print(f"⚠️ Local PostgreSQL init warning: {e}")
                print("💡 Make sure Docker container is running: docker-compose up -d")


# Convenience function for SQLAlchemy queries in local mode
@contextmanager
def get_local_session():
    """Context manager for local database sessions"""
    session = DatabaseManager.get_local_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
