CREATE TABLE run_series (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(255)    NOT NULL,
  description TEXT            NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_series_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
