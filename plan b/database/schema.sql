CREATE DATABASE IF NOT EXISTS inventory_management_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE inventory_management_system;

CREATE TABLE IF NOT EXISTS accountable_officers (
    officer_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    division VARCHAR(120) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_officer_name_division (name, division)
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
    property_name VARCHAR(150) NOT NULL,
    property_type VARCHAR(100) NOT NULL,
    unit_cost DECIMAL(12, 2) NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    description TEXT NULL,
    date_acquired DATE NOT NULL,
    current_condition VARCHAR(80) NOT NULL,
    remarks TEXT NULL,
    par_id INT UNSIGNED NOT NULL,
    funding_source VARCHAR(120) NOT NULL,
    classification VARCHAR(120) NOT NULL,
    bulk_reference VARCHAR(60) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_assets_property_type (property_type),
    INDEX idx_assets_funding_source (funding_source),
    INDEX idx_assets_classification (classification),
    INDEX idx_assets_date_acquired (date_acquired),
    INDEX idx_assets_par (par_id),
    CONSTRAINT fk_assets_par
        FOREIGN KEY (par_id)
        REFERENCES par(par_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;
