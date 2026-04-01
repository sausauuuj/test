CREATE DATABASE IF NOT EXISTS inventory_management_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE inventory_management_system;

CREATE TABLE IF NOT EXISTS divisions (
    division_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    label VARCHAR(180) NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO divisions (code, label, sort_order) VALUES
    ('ORD', 'ORD (Office of the Regional Director)', 1),
    ('FAD', 'FAD (Finance and Administrative Division)', 2),
    ('PDIPBD', 'PDIPBD (Project Development, Investment Programming, and Budgeting Division)', 3),
    ('PFPD', 'PFPD (Policy Formulation and Planning Division)', 4),
    ('PMED', 'PMED (Project Monitoring and Evaluation Division)', 5),
    ('DRD', 'DRD (Development Research Division)', 6)
ON DUPLICATE KEY UPDATE
    label = VALUES(label),
    sort_order = VALUES(sort_order);

CREATE TABLE IF NOT EXISTS funding_sources (
    funding_source_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO funding_sources (name, sort_order) VALUES
    ('NEDA/DEPDev IX', 1),
    ('RDC', 2)
ON DUPLICATE KEY UPDATE
    sort_order = VALUES(sort_order);

CREATE TABLE IF NOT EXISTS classifications (
    classification_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    label VARCHAR(120) NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO classifications (code, label, sort_order) VALUES
    ('PPE', 'PPE', 1),
    ('SEMI', 'Semi-Expendable', 2)
ON DUPLICATE KEY UPDATE
    label = VALUES(label),
    sort_order = VALUES(sort_order);

CREATE TABLE IF NOT EXISTS accountable_officers (
    officer_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    position VARCHAR(120) NOT NULL DEFAULT '',
    unit VARCHAR(120) NOT NULL DEFAULT '',
    division_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_officers_division (division_id),
    UNIQUE KEY uniq_officer_name_division (name, division_id),
    CONSTRAINT fk_officers_division
        FOREIGN KEY (division_id)
        REFERENCES divisions(division_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS par (
    par_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    par_number VARCHAR(40) NOT NULL UNIQUE,
    accountable_officer_id INT UNSIGNED NOT NULL,
    par_date DATE NOT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_par_officer_date (accountable_officer_id, par_date),
    CONSTRAINT fk_par_officer
        FOREIGN KEY (accountable_officer_id)
        REFERENCES accountable_officers(officer_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    property_id VARCHAR(60) NOT NULL UNIQUE,
    property_number VARCHAR(80) NULL,
    property_name VARCHAR(150) NOT NULL,
    property_type VARCHAR(100) NOT NULL,
    unit_cost DECIMAL(12, 2) NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    description TEXT NULL,
    date_acquired DATE NOT NULL,
    current_condition VARCHAR(80) NOT NULL,
    remarks TEXT NULL,
    par_id INT UNSIGNED NOT NULL,
    funding_source_id INT UNSIGNED NOT NULL,
    classification_id INT UNSIGNED NOT NULL,
    bulk_reference VARCHAR(60) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_assets_property_type (property_type),
    INDEX idx_assets_funding_source (funding_source_id),
    INDEX idx_assets_classification (classification_id),
    INDEX idx_assets_date_acquired (date_acquired),
    INDEX idx_assets_par (par_id),
    INDEX idx_assets_property_number (property_number),
    CONSTRAINT fk_assets_par
        FOREIGN KEY (par_id)
        REFERENCES par(par_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_assets_funding_source
        FOREIGN KEY (funding_source_id)
        REFERENCES funding_sources(funding_source_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_assets_classification
        FOREIGN KEY (classification_id)
        REFERENCES classifications(classification_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;
