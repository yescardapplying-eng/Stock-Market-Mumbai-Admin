-- ==============================================================
-- STOCK MARKET MUMBAI ADMIN — PRODUCTION DATABASE SCHEMA
-- Compatible with Hostinger MySQL & TiDB Cloud
-- Timezone: Asia/Kolkata (IST)
-- ==============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `leads` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `form_type` ENUM('popup', 'contact') NOT NULL DEFAULT 'popup' COMMENT 'popup: Lead Enquiry Modal, contact: Contact Us Page',
  `lead_reference` VARCHAR(40) UNIQUE,
  `full_name` VARCHAR(100) NOT NULL,
  `mobile_number` VARCHAR(20) NOT NULL,
  `state` VARCHAR(100) NULL,
  `segment` VARCHAR(100) NULL COMMENT 'Learning focus for popup',
  `capital_range` VARCHAR(100) NULL COMMENT 'Educational capital scale',
  `message` TEXT NULL COMMENT 'Inquiry query from Contact Us',
  `source_page` VARCHAR(255) DEFAULT '/',
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `status` ENUM('new', 'contacted', 'enrolled', 'not_interested', 'invalid') NOT NULL DEFAULT 'new',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_lead_form_type` (`form_type`),
  INDEX `idx_lead_status` (`status`),
  INDEX `idx_lead_created` (`created_at`),
  INDEX `idx_lead_mobile` (`mobile_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

