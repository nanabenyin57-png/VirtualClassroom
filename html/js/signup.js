const form = document.getElementById("registrationform");
window.addEventListener("DOMContentLoaded",(event) =>{
    form.style.display= "none";
}) 
let classselected = document.getElementById("_class");
const selector = document.getElementById("role");
 const rolebutton= document.getElementById("role_selector");
 const classhead= document.getElementById("classhead");
 let roles_selected = document.getElementById("userrole"); 
rolebutton.addEventListener("click", async (e) =>{
    e.preventDefault();
    const selection= selector.value;
    if (selection==="select_role"){
      window.alert("Please choose a role");
      form.style.display="none";
      classhead.style.display="none";
      classselected.style.display="none";
      

    }
    else if(selection==="student")
        {
        form.style.display="block";
        roles_selected.value=selector.value;
            classhead.style.display="block";
            classselected.style.display="block";

    }
    else{
        form.style.display="block";
        roles_selected.value=selector.value;
        classhead.style.display="none";
        classselected.style.display="none";
        
    }


})

document.getElementById('registrationform').addEventListener('submit', async (e) => {
    e.preventDefault(); // 1. Stops Chrome from redirecting/reloading the page!

    // 2. Collect all the values from your input boxes
    const firstname = document.getElementById('first-name').value;
    const middlename = document.getElementById('middle-name').value;
    const lastname = document.getElementById('last-name').value;
    const username = document.getElementById('user-name').value;
    const email = document.getElementById('e-mail').value;
    const password = document.getElementById('user-password').value;
    const confirmPassword = document.getElementById('confirmpassword').value;
    const role = document.getElementById('userrole').value;
    let classname = null;
    if (role === 'student'){
         classname = document.getElementById('_class').value;
    }
    if (password !== confirmPassword) {
        alert("❌ Passwords do not match!");
        return;
    }

    try {
        // 4. Send the payload across ports to your Node server (Port 5000)
        const response = await fetch('http://127.0.0.1:5000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstname,
                middlename,
                lastname,
                username,
                email,
                password,
                role, 
                classname
            })
        });

        const data = await response.json();

        if (data.success) {
            alert("🎉 Success: " + data.message);
            document.getElementById('registrationform').reset(); // Clears the glass form fields
        } else {
            alert("❌ Server Error: " + data.message);
        }

    } catch (err) {
        console.error("Transmission Error:", err);
        alert("❌ Could not connect to the backend server. Is your terminal running npm start?");
    }
});

function checkpassword() {//a MR_Tawiah function
    const password=document.getElementById("user-password").value;
    const confirm=document.getElementById("confirmpassword").value;
    if(password!==confirm){
        alert("Passwords do not match");
        return false;
    }
    else if(password.length<8){
        alert("Password too weak, must be at least 8 characters long");
        return false;
    }
    else{
        alert("Passwords match and loaded successfully.");
        return true;
    }
}


function checkmail() {//a MR_Tawiah function
    const mail=document.getElementById("e-mail").value;
    if(mail.length<5){
        alert("Email address is incorrect, Type your full email address.");
        return false;
    }
    else if(!mail.includes("@"))
{
        alert("Email address is incorrect, please enter a valid email address.");
        return false;
    }
    else{
        alert("Email address is valid.");
        return true;
    }
}

