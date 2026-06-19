CREATE DATABASE VirtualClassroom;

CREATE TABLE AppUsers(
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    firstname VARCHAR(50) NOT NULL,
    middlename VARCHAR(50),
    lastname VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(15) NOT NULL
);

SELECT * FROM AppUsers;

USE VirtualClassroom;

INSERT INTO AppUsers(
    firstname, middlename, lastname, username, email, password, role
) VALUES (
    'Godfred', 'Quason', 'Tawiah', 'tawiahgodfredquason', 'nanabenyin57@gmail.com', '$2b$10$UJ9/C6yC/yzkck3yU7cGMevM0kcUVqvRcshj3qdc5CV5InADHX3lS', 'admin'
);
USE VirtualClassroom;

 CREATE TABLE Notes(
    note_id INT IDENTITY(1,1) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

SELECT * FROM Notes;


