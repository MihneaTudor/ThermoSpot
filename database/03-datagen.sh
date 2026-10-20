set -o pipefail
python3 /docker-entrypoint-initdb.d/03-datagen.py | docker_process_sql
