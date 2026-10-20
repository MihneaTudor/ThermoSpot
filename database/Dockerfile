FROM mysql:8.4
ENV MYSQL_DATABASE=ThermoDB
RUN microdnf install -y python3 && microdnf clean all
COPY ./01-initdb.sql /docker-entrypoint-initdb.d/01-initdb.sql
COPY ./02-seed.sql /docker-entrypoint-initdb.d/02-seed.sql
COPY ./03-datagen.py /docker-entrypoint-initdb.d/03-datagen.py
COPY ./03-datagen.sh /docker-entrypoint-initdb.d/03-datagen.sh
EXPOSE 3306
# Arguments passed to mysqld by the base image's entrypoint.
CMD ["--character-set-server=utf8mb4", "--collation-server=utf8mb4_0900_ai_ci"]