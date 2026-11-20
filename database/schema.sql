
CREATE DATABASE IF NOT EXISTS alumnex_db;
USE alumnex_db;

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student','alumni','admin') NOT NULL,
    status ENUM('pending','approved','blocked')
        DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STUDENT PROFILES
CREATE TABLE IF NOT EXISTS student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    phone VARCHAR(30),
    department VARCHAR(150),
    course VARCHAR(150),
    study_year VARCHAR(30),
    semester VARCHAR(30),
    graduation_year INT,
    skills TEXT,
    interests TEXT,
    career_goals TEXT,
    resume_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    bio TEXT,
    photo_url VARCHAR(500),
    FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

-- ALUMNI PROFILES
CREATE TABLE IF NOT EXISTS alumni_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    phone VARCHAR(30),
    college VARCHAR(150),
    graduation_year INT,
    department VARCHAR(150),
    company VARCHAR(150),
    designation VARCHAR(150),
    skills TEXT,
    work_experience TEXT,
    linkedin_url VARCHAR(500),
    career_journey TEXT,
    bio TEXT,
    photo_url VARCHAR(500),
    FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

-- EVENTS
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATETIME NOT NULL,
    venue VARCHAR(200),
    registration_link VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE SET NULL
);

-- EVENT REGISTRATIONS
CREATE TABLE IF NOT EXISTS event_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_event_registration (event_id, user_id),
    FOREIGN KEY (event_id)
        REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

-- JOBS
CREATE TABLE IF NOT EXISTS jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumni_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    company VARCHAR(150) NOT NULL,
    location VARCHAR(150),
    description TEXT,
    application_link VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumni_id)
        REFERENCES users(id) ON DELETE CASCADE
);

-- MENTORSHIP
CREATE TABLE IF NOT EXISTS mentorship (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    alumni_id INT NOT NULL,
    message TEXT,
    status ENUM('pending','accepted','rejected')
        DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id)
        REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (alumni_id)
        REFERENCES users(id) ON DELETE CASCADE
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

SHOW TABLES;
