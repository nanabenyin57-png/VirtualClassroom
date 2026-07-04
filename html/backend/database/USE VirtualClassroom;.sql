USE VirtualClassroom;

CREATE TABLE course_preview(
    subjectname VARCHAR(25)NOT NULL,
    preview Text NOT NULL,
    subjectid INT PRIMARY KEY IDENTITY(1,1),
    heading VARCHAR(50) NOT NULL
)
Insert into course_preview(subjectname,preview,heading)
Values('Math', 'This course covers topics in algebra, geometry, calculus, and statistics.
         Students will learn problem-solving techniques and mathematical reasoning. this couse moves from high
          school mathematics 
         to advanced topics, preparing students for college-level mathematics and beyond. 
         The course includes interactive lessons, practice exercises, and assessments to track progress.
         Click on the sign up button to register for the course and start your journey in mathematics!', 
         'Mathematics Course Preview');

         INSERT INTO course_preview(subjectname, preview, heading)
         VALUES('Science', 'This course is designed to give students a comprehensive understanding of the world,
          principles of forces and nature, the scientific method, and the fundamental concepts of biology, chemistry, and physics.
          Students will engage in hands-on experiments, critical thinking exercises,
           and collaborative projects to develop their scientific inquiry skills. The course aims to foster curiosity, analytical thinking, and a passion for scientific exploration.
          Click on the sign up button to register for the course and start your journey in science!',
          'Science Course Preview');

          INSERT INTO course_preview(subjectname, preview, heading)
            VALUES('English', 'This course focuses on developing students'' language skills, including reading, writing, speaking, and listening. Students will explore various literary genres, 
            analyze texts, and enhance their vocabulary and grammar. The course emphasizes effective communication, 
            critical thinking, and creative expression. Through engaging activities, discussions, and writing assignments, 
            students will improve their proficiency in English and gain confidence in their language abilities.
            Click on the sign up button to register for the course and start your journey in English!',
            'English Course Preview');

            INSERT INTO course_preview(subjectname, preview, heading)
            VALUES('Social Studies', 'This course provides students with a comprehensive understanding of history,
             geography, civics, and cultural studies. The use of history to shape our today, the importance of geography in 
             understanding the world, and the role of civics in fostering responsible citizenship are explored.
             Students will engage in critical analysis of historical events, examine societal structures, and explore
              diverse cultures.
             The course aims to develop students analytical skills, cultural awareness, and civic responsibility. 
             Click on the sign up button to register for the course and start your journey in social studies!',
             'Social Studies Course Preview');