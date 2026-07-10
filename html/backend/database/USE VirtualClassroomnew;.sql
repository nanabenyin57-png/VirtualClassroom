USE VirtualClassroom;

UPDATE course_preview 
SET subjectname = LTRIM(RTRIM(subjectname));

UPDATE course_preview
SET topics = '
1. SET
2. Fractions
3. Indices and Standard Form
4. Algebraic Expressions
5. Linear Equations
6. Angles
7. Perimeter and Area of Plane Shapes
8. Data Collection and Presentation
9. Probability of Simple Events
10. Trigonometry'
WHERE subjectname = 'Math';

UPDATE course_preview
SET topics = '
1. States of Matter
2. Acid Bases and Salts
3. Cells and Human Body Systems
4. Energy, Forces and Machines
5. Solar System
6. Elements Compounds and Mixtures
7. Water cycle
8. Diseases
9. Electricity
10. Science Technology and Society
'
WHERE subjectname='Science';

SELECT * FROM course_preview;

UPDATE course_preview
SET topics ='
1. Fiction and Non-Fiction passages
2. Vocabulary Development
3. Paragraph Writing
4. Letter Writing
5. Argumentative Writing
6. Parts of Speech
7. Verbs and Tenses
8. Punctuations
9. Sentence Types and Conjunctions
10. Public Speaking and Debate
'
WHERE subjectname='English';