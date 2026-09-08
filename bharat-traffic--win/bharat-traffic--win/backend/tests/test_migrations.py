"""Runs the Alembic migration against a scratch PostgreSQL database.

Skipped automatically when no local PostgreSQL is reachable (e.g., CI),
so the suite stays runnable anywhere.
"""
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

ADMIN_URL = "postgresql+psycopg://akashyadav@localhost:5432/postgres"
TEST_DB = "btt_test_migrations"


def _postgres_available() -> bool:
    try:
        engine = create_engine(ADMIN_URL, connect_args={"connect_timeout": 2})
        with engine.connect():
            pass
        engine.dispose()
        return True
    except Exception:
        return False


@pytest.fixture(scope="module")
def migrated_db_url():
    if not _postgres_available():
        pytest.skip("local PostgreSQL not available")

    admin = create_engine(ADMIN_URL, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f'DROP DATABASE IF EXISTS "{TEST_DB}"'))
        conn.execute(text(f'CREATE DATABASE "{TEST_DB}"'))
    admin.dispose()

    yield f"postgresql+psycopg://akashyadav@localhost:5432/{TEST_DB}"

    admin = create_engine(ADMIN_URL, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{TEST_DB}'"))
        conn.execute(text(f'DROP DATABASE IF EXISTS "{TEST_DB}"'))
    admin.dispose()


def test_upgrade_creates_all_tables(migrated_db_url):
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", migrated_db_url)
    command.upgrade(cfg, "head")

    engine = create_engine(migrated_db_url)
    tables = set(inspect(engine).get_table_names())
    engine.dispose()

    expected = {
        "alembic_version", "users", "cities", "zones", "corridors", "roads",
        "intersections", "traffic_signals", "incidents", "traffic_records",
        "predictions", "simulations", "simulation_results", "emergency_routes",
        "road_intersection",
    }
    assert expected <= tables, f"missing tables: {expected - tables}"


def test_downgrade_reverses_migration(migrated_db_url):
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", migrated_db_url)
    command.downgrade(cfg, "base")

    engine = create_engine(migrated_db_url)
    remaining = set(inspect(engine).get_table_names())
    engine.dispose()
    assert "alembic_version" not in remaining or remaining == {"alembic_version"}
    assert "cities" not in remaining
