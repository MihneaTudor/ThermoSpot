FROM mysql:8.4

ENV MYSQL_DATABASE=ThermoDB
RUN microdnf install -y python3 && microdnf clean all

COPY ./tables/ /docker-entrypoint-initdb.d/tables/
EXPOSE 3306
# Arguments passed to mysqld by the base image's entrypoint.
CMD ["--character-set-server=utf8mb4", "--collation-server=utf8mb4_0900_ai_ci"]