FROM mysql:8.4

RUN microdnf install -y python3 && microdnf clean all

COPY ./tables/ /docker-entrypoint-initdb.d/
# COPY initdb.sh /docker-entrypoint-initdb.d/initdb.sh
# COPY reset-db.sh /usr/local/bin/reset-db
# RUN chmod 0755 /usr/local/bin/reset-db

EXPOSE 3306
# Arguments passed to mysqld by the base image's entrypoint.
CMD ["--character-set-server=utf8mb4", "--collation-server=utf8mb4_0900_ai_ci"]