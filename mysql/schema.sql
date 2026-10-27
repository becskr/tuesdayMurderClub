-- Tuesday Murder Club: MySQL / MariaDB schema.
-- Run once in phpMyAdmin (cPanel → phpMyAdmin → your database → SQL).
-- All times are stored in UTC.

CREATE TABLE IF NOT EXISTS documentary_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tmdb_id INT NOT NULL,
  media_type VARCHAR(5) NOT NULL DEFAULT 'movie',
  title VARCHAR(500) NOT NULL,
  overview TEXT NULL,
  runtime INT NULL,
  rating DECIMAL(4,2) NULL,
  poster_url VARCHAR(500) NULL,
  requested_by VARCHAR(20) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  watched_at DATETIME(3) NULL,
  -- Only one open case per documentary: this column is NULL once a case
  -- is closed, and UNIQUE ignores NULLs.
  active_key VARCHAR(40) AS (IF(watched_at IS NULL, CONCAT(media_type, '-', tmdb_id), NULL)) STORED,
  UNIQUE KEY one_active_request_per_documentary (active_key),
  KEY by_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
