USE VirtualClassroom;

CREATE TABLE students(
    firstname VARCHAR(30),
    middlename VARCHAR(30),
    lastname VARCHAR(30),
    studid INT IDENTITY(1,1) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(256) NOT NULL,
    classname CHAR(4) NOT NULL,
    userid INT REFERENCES AppUsers(user_id),
    role VARCHAR(15) 
    );

    
    DELETE FROM AppUsers
    WHERE role='student';

DROP TABLE IF EXISTS students;
    

    SELECT * FROM students;
    SELECT * FROM AppUsers;
