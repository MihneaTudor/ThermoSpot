CREATE TABLE process_runs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  machine_id  BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(255)    NOT NULL,
  series_id   BIGINT UNSIGNED NULL,
  options     JSON            NULL,
  started_at  DATETIME(6)     NOT NULL,
  ended_at    DATETIME(6)     NULL,            -- NULL while the run is still going
  status      ENUM('running','completed','paused', 'aborted','failed') NOT NULL DEFAULT 'running',
  PRIMARY KEY (id),
  -- A series number can only be used once per user (several NULL pairs are allowed).
  UNIQUE KEY uq_runs_series (user_id, series_id),
  KEY idx_runs_user_started (user_id, started_at),
  KEY idx_runs_machine_started (machine_id, started_at),
  CONSTRAINT fk_runs_user    FOREIGN KEY (user_id)    REFERENCES users (id),
  CONSTRAINT fk_runs_machine FOREIGN KEY (machine_id) REFERENCES machines (id),
  CONSTRAINT fk_runs_series  FOREIGN KEY (series_id)  REFERENCES run_series (id),
  CONSTRAINT chk_runs_series CHECK ((series_id IS NULL) = (series_id IS NULL)),
  CONSTRAINT chk_runs_times  CHECK (ended_at IS NULL OR ended_at >= started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
