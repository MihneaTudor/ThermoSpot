import random
import sys
from datetime import datetime, timedelta


RUN_ID_QUERY = (
    "(SELECT id FROM process_runs WHERE name = 'Test Run 1' "
    "AND series_name = 'Tests 1' AND series_no = 1 "
    "AND user_id = (SELECT id FROM users WHERE email = 'company@example.com'))"
)
READING_COLUMNS = [
    f"m_{row}{column}" for row in range(8) for column in range(8)
]


def generate_data(data_size: int = 1000) -> None:
    if data_size < 0:
        raise ValueError("data_size must be non-negative")
    if data_size == 0:
        return

    columns = ", ".join(["run_id", "recorded_at", "seq_no", *READING_COLUMNS])
    print(f"INSERT INTO readings ({columns})")
    print("VALUES")

    recorded_at = datetime.now()
    for index in range(data_size):
        timestamp = (recorded_at + timedelta(milliseconds=index)).strftime(
            "%Y-%m-%d %H:%M:%S.%f"
        )
        values = [
            RUN_ID_QUERY,
            f"'{timestamp}'",
            str(index),
            *(str(random.randint(30, 150)) for _ in READING_COLUMNS),
        ]
        suffix = "," if index < data_size - 1 else ";"
        print(f"  ({', '.join(values)}){suffix}")


if __name__ == "__main__":
    size = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    generate_data(size)
