document.getElementById('signin').addEventListener("submit", async (e)=>{
    e.preventDefault();
    // Handle form submission
const email=document.getElementById("email").value;
const password=document.getElementById("password").value;


try{
const response=await fetch("http://127.0.0.1:5000/api/login",{
    method:"POST",
    headers:{
        "Content-Type":"application/json"
    },
    body:JSON.stringify({email,password})
});

const data=await response.json();

if(data.success){
    alert("Login succesfull! Welcome back, "+data.user.firstname+"!");
}
else{
    alert("Login failed, Please make sure ypur credentials are correct and try again.");
}
//redirect ther user to a page based on role
if(data.user.role==="admin"){
    window.location.href="admin.html";
}
else if(data.user.role==="teacher"){
    window.location.href="teacher.html";
}
else {
    window.location.href="student.html";
}
}
catch(err){
    console.error("Error during login:",err);
    alert("An error occurred while trying to log in. Please try again later.");
}
});
