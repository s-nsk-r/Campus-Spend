import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Cloud DB URL (e.g. Neon.tech / Supabase PostgreSQL) or fallback to local SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./campus_spend.db")

# SQLAlchemy requires "postgresql://" instead of "postgres://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configure engine with graceful cloud-to-local fallback
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_size=25,
            max_overflow=35,
            pool_timeout=30,
            connect_args={"connect_timeout": 5}
        )
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[Database] ✓ Successfully connected to Neon Cloud PostgreSQL Database!")
    except Exception as e:
        print(f"[Database] Cloud DB unreachable ({e}). Using local SQLite fallback for development.")
        DATABASE_URL = "sqlite:///./campus_spend.db"
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False}
        )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for obtaining a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
