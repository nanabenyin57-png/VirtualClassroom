const { response } = require("express");



//this code is to hide the course preview block when the page loads.
const hamburgerdisplay=document.getElementById("hamburger_show");
window.addEventListener("DOMContentLoaded", (event) => {
    const previewBlock = document.getElementById("course_preview");
    previewBlock.style.display = "none";
    hamburgerdisplay.style.display="none";
  });

//This function is used to display the menu block
  const HamburgerButton=document.getElementById("hamburger_menu");
HamburgerButton.addEventListener("click", async (e) =>{
if(hamburgerdisplay.style.display==="block"){
    hamburgerdisplay.style.display="none";
}
else{
    hamburgerdisplay.style.display="block";
}
});

//to close the menudisplayblock
const closemenu=document.getElementById("bodyofwork");
 closemenu.addEventListener("click", async(e)=>{
    hamburgerdisplay.style.display="none";
 });

//This is to preview a couse. 
const subjectInput=document.getElementById("courses");
const subjectButton=document.getElementById("course");
 const previewBlock = document.getElementById("course_preview");
 
subjectButton.addEventListener("click", async (e)=>{
    e.preventDefault();
   const subject=subjectInput.value;
    if(!subject){
        previewBlock.style.display = "none"; 
        alert("Please select a subject to preview.");
        return;
    }
    try{
        const response = await fetch(`http://127.0.0.1:5000/api/course_preview?subjectname=${encodeURIComponent(subject)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if(data.length!==0){
            const heading = data[0].heading;
            const preview= data[0].preview;
            previewBlock.style.display = "block"; 
                document.getElementById("course_itself").innerHTML = `
                ${heading}
            
            `;

            document.getElementById("course_descriptions").innerHTML = `
            ${preview}
            `;  


        }
    }
    catch(err){
        console.error("Error fetching course preview:", err);
        alert("Failed to fetch course preview. Please try again later.");
    }

});
//This fuction is to load the topics in a subjectx,

 const topicsbutton = document.getElementById("loadtopics");
 topicsbutton.addEventListener("click", async (e)=>{
    e.preventDefault();
    const subject= subjectInput.value;
     const topiclist = document.getElementById("coursetopics");
    if(!subject){
        previewBlock.style.display="none";
        alert("Please choose a subject to see the course list");
        return;
    }
    try{
        const fetchtopics = await fetch(`http://127.0.0.1:5000/api/loadtopics?subjectname=${encodeURIComponent(subject)}`);
        if (!fetchtopics.ok){
            throw new Error(`http error! status: ${fetchtopics.status}`);
        }


        const topicsresponse = await fetchtopics.json();
        if(topicsresponse.success && topicsresponse.topics){
            document.getElementById("coursetopics").innerText = topicsresponse.topics;

        }

        else{
            document.getElementById("coursetopics").innerText = "No topics available";
        }
    }
    catch(err){
        console.error("could not find any topic list", err);
        alert("could not fetch the topics for that course. Try again later");
    }

 } );

