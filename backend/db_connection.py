import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
import os

load_dotenv()

def get_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            port=int(os.getenv("DB_PORT", 3306))
        )

        if connection.is_connected():
            print("Successfully connected to MySQL!")
            return connection

    except Error as e:
        print(f"Error connecting to MySQL: {e}")

    return None


def close_connection(connection):
    if connection and connection.is_connected():
        connection.close()
        print("MySQL connection closed.")
