#!/usr/bin/env bash

set -euo pipefail

database="ThermoDB"
init_dir="/docker-entrypoint-initdb.d"
required_files=(
  "$init_dir/01-users.sql"
  "$init_dir/02-machines.sql"
  "$init_dir/03-run-series.sql"
  "$init_dir/04-process-runs.sql"
  "$init_dir/05-readings.sql"
  "$init_dir/06-seed.sql"
  "$init_dir/07-datagen.py"
)

for command in mysql python3; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command not found: $command" >&2
    exit 1
  fi
done

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Required initialization file not found: $file" >&2
    exit 1
  fi
done

if [[ -n "${MYSQL_ROOT_PASSWORD_FILE:-}" ]]; then
  if [[ ! -r "$MYSQL_ROOT_PASSWORD_FILE" ]]; then
    echo "Cannot read MYSQL_ROOT_PASSWORD_FILE." >&2
    exit 1
  fi
  mysql_root_password=$(<"$MYSQL_ROOT_PASSWORD_FILE")
elif [[ -n "${MYSQL_ROOT_PASSWORD:-}" ]]; then
  mysql_root_password=$MYSQL_ROOT_PASSWORD
else
  echo "Set MYSQL_ROOT_PASSWORD or MYSQL_ROOT_PASSWORD_FILE before running this script." >&2
  exit 1
fi

escaped_password=${mysql_root_password//\\/\\\\}
escaped_password=${escaped_password//\"/\\\"}
client_config=$(mktemp)
trap 'rm -f "$client_config"' EXIT
chmod 600 "$client_config"
printf '[client]\nuser=root\npassword="%s"\n' "$escaped_password" >"$client_config"

mysql_client=(mysql --defaults-extra-file="$client_config")
if ! "${mysql_client[@]}" --execute="SELECT 1;" >/dev/null; then
  echo "Could not connect to MySQL as root; database was not changed." >&2
  exit 1
fi

printf 'This will permanently delete all data in %s and recreate it with sample data.\n' "$database"
read -r -p "Type $database to continue: " confirmation
if [[ "$confirmation" != "$database" ]]; then
  echo "Reset cancelled."
  exit 1
fi

"${mysql_client[@]}" --execute="DROP DATABASE IF EXISTS \`$database\`; CREATE DATABASE \`$database\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"

for file in "${required_files[@]:0:6}"; do
  "${mysql_client[@]}" --database="$database" <"$file"
done

python3 "$init_dir/07-datagen.py" | "${mysql_client[@]}" --database="$database"

echo "Database $database was reset and sample data was loaded."
