CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255)    NOT NULL,
  display_name  VARCHAR(100)    NOT NULL,
  password_hash VARCHAR(255)    NULL,
  created_at    DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at    DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE machines (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  name             VARCHAR(100)    NOT NULL,
  created_at       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at       DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_machines_user_name (user_id, name),
  CONSTRAINT fk_machines_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE run_series (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(255)    NOT NULL,
  description TEXT            NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_series_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE readings (
  run_id      BIGINT UNSIGNED NOT NULL,
  recorded_at DATETIME(6)     NOT NULL,
  received_at DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  seq_no      INT UNSIGNED    NULL,
  is_suspect  TINYINT(1)      NOT NULL DEFAULT 0,  -- 1 = flagged as bad data

  m_00 FLOAT NOT NULL, m_01 FLOAT NOT NULL, m_02 FLOAT NOT NULL, m_03 FLOAT NOT NULL,
  m_04 FLOAT NOT NULL, m_05 FLOAT NOT NULL, m_06 FLOAT NOT NULL, m_07 FLOAT NOT NULL,

  m_10 FLOAT NOT NULL, m_11 FLOAT NOT NULL, m_12 FLOAT NOT NULL, m_13 FLOAT NOT NULL,
  m_14 FLOAT NOT NULL, m_15 FLOAT NOT NULL, m_16 FLOAT NOT NULL, m_17 FLOAT NOT NULL,

  m_20 FLOAT NOT NULL, m_21 FLOAT NOT NULL, m_22 FLOAT NOT NULL, m_23 FLOAT NOT NULL,
  m_24 FLOAT NOT NULL, m_25 FLOAT NOT NULL, m_26 FLOAT NOT NULL, m_27 FLOAT NOT NULL,

  m_30 FLOAT NOT NULL, m_31 FLOAT NOT NULL, m_32 FLOAT NOT NULL, m_33 FLOAT NOT NULL,
  m_34 FLOAT NOT NULL, m_35 FLOAT NOT NULL, m_36 FLOAT NOT NULL, m_37 FLOAT NOT NULL,

  m_40 FLOAT NOT NULL, m_41 FLOAT NOT NULL, m_42 FLOAT NOT NULL, m_43 FLOAT NOT NULL,
  m_44 FLOAT NOT NULL, m_45 FLOAT NOT NULL, m_46 FLOAT NOT NULL, m_47 FLOAT NOT NULL,

  m_50 FLOAT NOT NULL, m_51 FLOAT NOT NULL, m_52 FLOAT NOT NULL, m_53 FLOAT NOT NULL,
  m_54 FLOAT NOT NULL, m_55 FLOAT NOT NULL, m_56 FLOAT NOT NULL, m_57 FLOAT NOT NULL,

  m_60 FLOAT NOT NULL, m_61 FLOAT NOT NULL, m_62 FLOAT NOT NULL, m_63 FLOAT NOT NULL,
  m_64 FLOAT NOT NULL, m_65 FLOAT NOT NULL, m_66 FLOAT NOT NULL, m_67 FLOAT NOT NULL,

  m_70 FLOAT NOT NULL, m_71 FLOAT NOT NULL, m_72 FLOAT NOT NULL, m_73 FLOAT NOT NULL,
  m_74 FLOAT NOT NULL, m_75 FLOAT NOT NULL, m_76 FLOAT NOT NULL, m_77 FLOAT NOT NULL,

  PRIMARY KEY (run_id, recorded_at),
  CONSTRAINT fk_readings_run FOREIGN KEY (run_id) REFERENCES process_runs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;