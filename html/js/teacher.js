const menu = document.getElementById('hamburgermenu'); //[cite: 6]
const navigation = document.getElementById('navigation'); //[cite: 6]
const classcontent = document.getElementById("classcontent"); //[cite: 6]

// Run once when DOM is fully loaded
window.addEventListener("DOMContentLoaded", () => {
    navigation.style.display = "none"; //[cite: 6]

    // Load saved avatar from localStorage with cache buster
    const profilepicture = document.getElementById("profileimg"); //[cite: 6]
    const user = JSON.parse(localStorage.getItem("user")); //[cite: 6]
    if (user && user.profileimg && profilepicture) {
        profilepicture.src = `${user.profileimg}?t=${Date.now()}`;
    }
});

// Navigation Toggle
menu.addEventListener('click', () => {
    if (navigation.style.display === "none") {
        navigation.style.display = "block"; //[cite: 6]
    } else {
        navigation.style.display = "none"; //[cite: 6]
    }
});

// Helper to render roster into #classcontent
function displaystudents(students) {
    classcontent.innerHTML = ""; // Clear existing records[cite: 6]

    if (!students || students.length === 0) {
        classcontent.innerHTML = "<p>No students enrolled in this class.</p>"; //[cite: 6]
        return; //[cite: 6]
    }

    const list = document.createElement("ul"); //[cite: 6]
    list.className = "student-list"; //[cite: 6]

    students.forEach(student => {
        const item = document.createElement("li"); //[cite: 6]
        const fullName = `${student.firstname} ${student.middlename ? student.middlename + ' ' : ''}${student.lastname}`; //[cite: 6]
        item.textContent = `${fullName} (ID: ${student.studid})`; //[cite: 6]
        list.appendChild(item); //[cite: 6]
    });

    classcontent.appendChild(list); //[cite: 6]
}

// Class Button Listeners
const classbuttons = document.querySelectorAll(".class-btn"); //[cite: 6]
let activeclass = null; //[cite: 6]

classbuttons.forEach((button) => {
    button.addEventListener("click", async (e) => {
        e.preventDefault(); //[cite: 6]
        const selectedclass = e.currentTarget.dataset.class; //[cite: 6]

        if (activeclass === selectedclass) {
            activeclass = null; //[cite: 6]
            classcontent.style.display = "none"; //[cite: 6]
            return; //[cite: 6]
        }

        try {
            const token = localStorage.getItem("token"); //[cite: 6]

            const response = await fetch("http://127.0.0.1:5000/api/classlist", {
                method: "POST", //[cite: 6]
                headers: {
                    "Content-Type": "application/json", //[cite: 6]
                    "Authorization": `Bearer ${token}` //[cite: 6]
                },
                body: JSON.stringify({ classname: selectedclass }) //[cite: 6]
            });

            const data = await response.json(); //[cite: 6]

            if (data.success) {
                displaystudents(data.students); //[cite: 6]
                classcontent.style.display = "block"; //[cite: 6]
                activeclass = selectedclass; //[cite: 6]
            } else {
                alert("Class list could not be loaded: " + data.message); //[cite: 6]
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem("token"); //[cite: 6]
                    window.location.href = "signin.html"; //[cite: 6]
                }
            }
        } catch (err) {
            console.error("Error fetching class list:", err); //[cite: 6]
            alert("An error occurred while trying to fetch the class list."); //[cite: 6]
        }
    });
});

// Profile Image Upload Handling
const fileinput = document.getElementById("userprofile");
const profilepicture = document.getElementById("profileimg");

if (fileinput) {
    fileinput.addEventListener("change", async (event) => {
        // Prevent any default behavior/form submission that could trigger a page reload
        event.preventDefault();

        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("profileimg", file);

        const token = localStorage.getItem("token");

        try {
            // Send file to server FIRST
            const response = await fetch("http://127.0.0.1:5000/api/upload-profile-image", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error("Failed to upload profile image");
            }

            const data = await response.json();

            if (data.success) {
                // 1. Update localStorage FIRST so any subsequent reads get the new URL
                const user = JSON.parse(localStorage.getItem("user")) || {};
                user.profileimg = data.imageUrl;
                localStorage.setItem("user", JSON.stringify(user));

                // 2. Add timestamp cache buster and update the active image element
                const freshUrl = `${data.imageUrl}?t=${Date.now()}`;
                if (profilepicture) {
                    profilepicture.src = freshUrl;
                }

                alert("Profile image uploaded successfully!");
            } else {
                alert("Upload failed: " + data.message);
            }
        } catch (err) {
            console.error("Error saving file:", err);
            alert("An error occurred while uploading your profile image.");
        }
    });
}