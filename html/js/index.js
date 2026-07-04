//This is to preview a couse. 
const subjectInput=document.getElementById("courses");
const subjectButton=document.getElementById("course");
subjectButton.addEventListener("click", async (e)=>{
    e.preventDefault();
    const subject=subjectInput.value;
    if(!subject) {
        alert("Please select a course.");
        return;
    }
    else if(subject==="maths"){
        const preview=document.getElementById("course_preview");
        preview.innerHTML=`
        <h2>Mathematics Course Preview</h2>
        <p>This course covers topics in algebra, geometry, calculus, and statistics.
         Students will learn problem-solving techniques and mathematical reasoning. this couse moves from high school mathematics 
         to advanced topics, preparing students for college-level mathematics and beyond. 
         The course includes interactive lessons, practice exercises, and assessments to track progress.
         Click on the sign up button to register for the course and start your journey in mathematics!
         </p>
        `;
    }
});