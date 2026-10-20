INSERT INTO users (email, display_name)
VALUES ('company@example.com', 'Big Company');

INSERT INTO machines (user_id, name)
VALUES (
  (SELECT id FROM users WHERE email = 'company@example.com'),
  'printer-1'
);

INSERT INTO process_runs (user_id, machine_id, name, series_name, series_no, started_at, ended_at, status)
VALUES (
  (SELECT id FROM users WHERE email = 'company@example.com'),
  (
    SELECT m.id
    FROM machines AS m
    JOIN users AS u ON u.id = m.user_id
    WHERE u.email = 'company@example.com' AND m.name = 'printer-1'
  ),
  'Test Run 1', 'Tests 1', 1, NOW(), NULL, 'running'
);