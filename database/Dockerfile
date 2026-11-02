FROM mysql:8.4
ENV MYSQL_DATABASE=ThermoDB
RUN microdnf install -y python3 && microdnf clean all
COPY ./01-users.sql /docker-entrypoint-initdb.d/01-users.sql
COPY ./02-machines.sql /docker-entrypoint-initdb.d/02-machines.sql
COPY ./03-run-series.sql /docker-entrypoint-initdb.d/03-run-series.sql
COPY ./04-process-runs.sql /docker-entrypoint-initdb.d/04-process-runs.sql
COPY ./05-readings.sql /docker-entrypoint-initdb.d/05-readings.sql
COPY ./06-seed.sql /docker-entrypoint-initdb.d/06-seed.sql
COPY ./07-datagen.py /docker-entrypoint-initdb.d/07-datagen.py
COPY ./07-datagen.sh /docker-entrypoint-initdb.d/07-datagen.sh
EXPOSE 3306
# Arguments passed to mysqld by the base image's entrypoint.
CMD ["--character-set-server=utf8mb4", "--collation-server=utf8mb4_0900_ai_ci"]