import os
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

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



def list_logs(user_id):
    connection = connect_database()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT runs.id, runs.name, runs.started_at, runs.ended_at, runs.estimated_end_at,
                       runs.status, runs.notes, machines.name AS device
                FROM process_runs AS runs
                JOIN machines ON machines.id = runs.machine_id
                WHERE runs.user_id = %s
                ORDER BY runs.started_at DESC
                """,
                (user_id,),
            )
            return cursor.fetchall()
    finally:
        connection.close()


def create_log(user_id, name, status, machine_name=None):
    connection = connect_database()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT id FROM machines
                WHERE (%s IS NULL OR name = %s)
                ORDER BY id
                LIMIT 1
                """,
                (machine_name, machine_name),
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
                (user_id, machine["id"], name, status, status),
            )
            run_id = cursor.lastrowid
            connection.commit()
            return run_id
    finally:
        connection.close()


def get_log(user_id, run_id, since=None):
    connection = connect_database()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT runs.id, runs.name, runs.started_at, runs.ended_at,
                       runs.estimated_end_at, runs.status, runs.notes,
                       machines.name AS device
                FROM process_runs AS runs
                JOIN machines ON machines.id = runs.machine_id
                WHERE runs.id = %s AND runs.user_id = %s
                """,
                (run_id, user_id),
            )
            run = cursor.fetchone()
            if run is None:
                return None

            columns = ", ".join(READING_COLUMNS)
            query = f"SELECT recorded_at, {columns} FROM readings WHERE run_id = %s"
            params = [run_id]
            if since is not None:
                query += " AND recorded_at > %s"
                params.append(since)
            query += " ORDER BY recorded_at"

            cursor.execute(query, tuple(params))
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


def update_log_notes(user_id, run_id, notes):
    connection = connect_database()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE process_runs SET notes = %s WHERE id = %s AND user_id = %s",
                (notes, run_id, user_id),
            )
            connection.commit()
            # rowcount is 0 if the run doesn't exist, isn't yours, or the notes are unchanged
            return cursor.rowcount > 0
    finally:
        connection.close()
