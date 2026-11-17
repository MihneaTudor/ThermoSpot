import os
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DEMO_USER_EMAIL = os.getenv("DEMO_USER_EMAIL", "company@example.com")
READING_COLUMNS = [f"m_{row}{column}" for row in range(8) for column in range(8)]


def connect_database():
    required_settings = ("MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD")
    missing_settings = [name for name in required_settings if not os.getenv(name)]
    if missing_settings:
        raise RuntimeError(
            "Missing database environment settings: " + ", ".join(missing_settings)
        )

    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        database=os.environ["MYSQL_DATABASE"],
        user=os.environ["MYSQL_USER"],
        password=os.environ["MYSQL_PASSWORD"],
    )


def list_logs():
    connection = connect_database()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT runs.id, runs.name, runs.started_at, runs.ended_at,
                       runs.status, runs.notes, machines.name AS device
                FROM process_runs AS runs
                JOIN machines ON machines.id = runs.machine_id
                JOIN users ON users.id = runs.user_id
                WHERE users.email = %s
                ORDER BY runs.started_at DESC
                """,
                (DEMO_USER_EMAIL,),
            )
            return cursor.fetchall()
    finally:
        connection.close()


def create_log(name, status, machine_name=None):
    connection = connect_database()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT users.id AS user_id, machines.id AS machine_id
                FROM users
                JOIN machines ON machines.user_id = users.id
                WHERE users.email = %s
                  AND (%s IS NULL OR machines.name = %s)
                ORDER BY machines.id
                LIMIT 1
                """,
                (DEMO_USER_EMAIL, machine_name, machine_name),
            )
            machine = cursor.fetchone()
            if machine is None:
                return None

            cursor.execute(
                """
                INSERT INTO process_runs (
                    user_id, machine_id, name, started_at, ended_at, status
                )
                VALUES (
                    %s, %s, %s, UTC_TIMESTAMP(6),
                    CASE WHEN %s = 'running' THEN NULL ELSE UTC_TIMESTAMP(6) END,
                    %s
                )
                """,
                (
                    machine["user_id"],
                    machine["machine_id"],
                    name,
                    status,
                    status,
                ),
            )
            run_id = cursor.lastrowid
            connection.commit()
            return run_id
    finally:
        connection.close()


def get_log(run_id):
    connection = connect_database()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT runs.id, runs.name, runs.started_at, runs.ended_at,
                       runs.status, runs.notes, machines.name AS device
                FROM process_runs AS runs
                JOIN machines ON machines.id = runs.machine_id
                JOIN users ON users.id = runs.user_id
                WHERE runs.id = %s AND users.email = %s
                """,
                (run_id, DEMO_USER_EMAIL),
            )
            run = cursor.fetchone()
            if run is None:
                return None

            columns = ", ".join(READING_COLUMNS)
            cursor.execute(
                f"SELECT recorded_at, {columns} FROM readings "
                "WHERE run_id = %s ORDER BY recorded_at",
                (run_id,),
            )
            run["readings"] = [
                {
                    "recorded_at": row["recorded_at"],
                    "values": [row[column] for column in READING_COLUMNS],
                }
                for row in cursor.fetchall()
            ]
            return run
    finally:
        connection.close()


def update_log_notes(run_id, notes):
    connection = connect_database()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT runs.id
                FROM process_runs AS runs
                JOIN users ON users.id = runs.user_id
                WHERE runs.id = %s AND users.email = %s
                """,
                (run_id, DEMO_USER_EMAIL),
            )
            if cursor.fetchone() is None:
                return False

            cursor.execute(
                "UPDATE process_runs SET notes = %s WHERE id = %s",
                (notes, run_id),
            )
            connection.commit()
            return True
    finally:
        connection.close()