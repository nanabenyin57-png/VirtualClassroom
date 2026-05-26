function checkpassword() {//a MR_Tawiah function
    const password=document.getElementById("password").value;
    const confirm=document.getElementById("confirm").value;
    if(password!==confirm){
        alert("Passwords do not match");
        return false;
    }
    else if(password.lenghth<8){
        alert("Password too week, must be at least 8 characters long");
        return false;
    }
    else{
        alert("Passwords match and loaded successfully.");
        return true;
    }
}