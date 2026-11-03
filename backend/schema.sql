-- ==================================================
-- SMART COMPLAINT MANAGEMENT SYSTEM
-- Database Schema
-- Existing tables preserved + FR7 added
-- ==================================================

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
    locked_until DATETIME NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;


-- COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS complaints (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    complaint_id CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,

    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,

    category VARCHAR(100) NOT NULL DEFAULT 'Uncategorized',

    status ENUM(
        'submitted',
        'assigned',
        'in_progress',
        'resolved',
        'closed'
    ) NOT NULL DEFAULT 'submitted',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_complaints_complaint_id (complaint_id),

    KEY idx_complaints_user_id (user_id),

    CONSTRAINT fk_complaints_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)

) ENGINE=InnoDB;


-- ==================================================
-- FR7: COMPLAINT STATUS HISTORY TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS complaint_status_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    complaint_id CHAR(36) NOT NULL,

    old_status ENUM(
        'submitted',
        'assigned',
        'in_progress',
        'resolved',
        'closed'
    ) NOT NULL,

    new_status ENUM(
        'submitted',
        'assigned',
        'in_progress',
        'resolved',
        'closed'
    ) NOT NULL,

    admin_id BIGINT UNSIGNED NOT NULL,

    remark VARCHAR(499) NOT NULL,

    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_status_history_complaint (complaint_id),

    KEY idx_status_history_admin (admin_id),

    CONSTRAINT fk_history_complaint
        FOREIGN KEY (complaint_id)
        REFERENCES complaints(complaint_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_history_admin
        FOREIGN KEY (admin_id)
        REFERENCES users(id)

) ENGINE=InnoDB;