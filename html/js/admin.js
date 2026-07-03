//Add the welcome message
const welcome=document.getElementById("admin_welcome");
const user=localStorage.getItem("firstname");
if(user){
    welcome.textContent="Welcome "+user+" to the admin dashboard!";
}


document.getElementById('addnotes').addEventListener("submit", async (e)=>{
    e.preventDefault();

const title=document.getElementById("title").value;
const content=document.getElementById("content").value;

try{
    const response=await fetch("http://127.0.0.1:5000/api/addnotes",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({title,content})
    });

    const data=await response.json();

    if(data.success){
        alert("Note added successfully!");
        document.getElementById("title").value="";
        document.getElementById("content").value="";
    }
    else{
        alert("Failed to add note. Please try again.");
    }   
}
catch(err){
    console.error("Error adding note:",err);
    alert("An error occurred while trying to add the note. Please try again later.");
}
});