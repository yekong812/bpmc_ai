CREATE TABLE IF NOT EXISTS admin_user (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  login_id VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
  use_yn CHAR(1) NOT NULL DEFAULT 'Y',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_admin_login_id (login_id)
);

CREATE TABLE IF NOT EXISTS ai_document (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(30) NOT NULL,
  content LONGTEXT NOT NULL,
  source_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
  source_file_name VARCHAR(255) NULL,
  source_file_url VARCHAR(1000) NULL,
  event_start_date DATE NULL,
  event_end_date DATE NULL,
  published_at DATETIME NULL,
  valid_from DATETIME NULL,
  valid_until DATETIME NULL,
  publish_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  index_status VARCHAR(20) NOT NULL DEFAULT 'NOT_INDEXED',
  index_error TEXT NULL,
  created_by VARCHAR(100) NULL,
  updated_by VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_event_date (event_start_date, event_end_date),
  INDEX idx_valid_date (valid_from, valid_until),
  INDEX idx_status (publish_status, index_status)
);
