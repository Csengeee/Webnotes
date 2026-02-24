CREATE TABLE user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    registration_date DATETIME,
    password_change_date DATETIME
);

CREATE TABLE note (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255),
    content TEXT,
    creation_date DATETIME,
    modification_date DATETIME,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE TABLE tag (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE note_tag (
    note_id INT,
    tag_id INT,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY (note_id) REFERENCES note(id),
    FOREIGN KEY (tag_id) REFERENCES tag(id)
);
