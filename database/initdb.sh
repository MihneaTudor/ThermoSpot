set -euo pipefail

if ! database_exists=$(mysql --batch --skip-column-names --execute \
  "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'ThermoDB');"); then
  echo "Failed to check whether database ThermoDB exists." >&2
  exit 1
fi

if [[ "$database_exists" == "1" ]]; then
  echo "Database ThermoDB already exists."
else
  echo "Database ThermoDB does not exist. Creating it..."
  mysql --execute "CREATE DATABASE ThermoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
fi