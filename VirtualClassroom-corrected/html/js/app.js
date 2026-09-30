// --- VIEW SWITCHING LOGIC ---
const views = document.querySelectorAll('.app-view');
const navTabs = document.querySelectorAll('.nav-tab, .nav-link-mob');

function switchView(targetId) {
    views.forEach(view => {
        if (view.id === targetId) {
            view.style.display = 'flex';
            view.classList.add('active-view');
        } else {
            view.style.display = 'none';
            view.classList.remove('active-view');
        }
    });
}

// Default state: show home, hide others
window.addEventListener("DOMContentLoaded", () => {
    views.forEach(view => {
        if (view.id !== 'home-section') view.style.display = 'none';
    });
    const previewBlock = document.getElementById("course_preview");
    if (previewBlock) previewBlock.style.display = "none";
    const hamburgerdisplay = document.getElementById("hamburger_show");
    if (hamburgerdisplay) hamburgerdisplay.style.display = "none";

    // Initialize signup role conditional fields if present
    const classHead = document.getElementById("classhead");
    const classSelect = document.getElementById("_class");
    if (classHead && classSelect) {
        classHead.style.display = "none";
        classSelect.style.display = "none";
    }
});

// Bind tab switching clicks
navTabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = tab.getAttribute("data-target");
        switchView(targetId);
        const hamburgerdisplay = document.getElementById("hamburger_show");
        if (hamburgerdisplay) hamburgerdisplay.style.display = "none";
    });
});

// --- HAMBURGER MENU ---
const hamburgerButton = document.getElementById("hamburger_menu");
const hamburgerDisplay = document.getElementById("hamburger_show");
if (hamburgerButton && hamburgerDisplay) {
    hamburgerButton.addEventListener("click", () => {
        hamburgerDisplay.style.display = hamburgerDisplay.style.display === "block" ? "none" : "block";
    });
}

// --- COURSE PREVIEW LOGIC ---
const subjectInput = document.getElementById("courses");
const subjectButton = document.getElementById("course");
const previewBlock = document.getElementById("course_preview");

if (subjectButton) {
    subjectButton.addEventListener("click", async (e) => {
        e.preventDefault();
        const subject = subjectInput.value;
        if (!subject) {
            previewBlock.style.display = "none";
            alert("Please select a subject to preview.");
            return;
        }
        try {
            const response = await fetch(`${apiUrl('/api/course_preview')}?subjectname=${encodeURIComponent(subject)}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.length !== 0) {
                previewBlock.style.display = "block";
                document.getElementById("course_itself").innerHTML = data[0].heading;
                document.getElementById("course_descriptions").innerHTML = data[0].preview;
                document.getElementById("coursetopics").innerText = data[0].topics;
                document.getElementById("coursetopics").style.display = "none";
            }
        } catch (err) {
            console.error("Error fetching course preview:", err);
            alert("Failed to fetch course preview. Please try again later.");
        }
    });
}

const loadtopics = document.getElementById("loadtopics");
if (loadtopics) {
    loadtopics.addEventListener("click", () => {
        const topicEl = document.getElementById("coursetopics");
        topicEl.style.display = topicEl.style.display === "block" ? "none" : "block";
    });
}

// --- SIGN IN LOGIC ---
const signinForm = document.getElementById('signin');
if (signinForm) {
    signinForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch(apiUrl('/api/login'), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (data.success) {
                alert("Login successful! Welcome back, " + data.user.firstname + "!");
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("firstname", data.user.firstname);

                if (data.user.role === "admin") window.location.href = "admin.html";
                else if (data.user.role === "teacher") window.location.href = "teacher.html";
                else window.location.href = "student.html";
            } else {
                alert("Login failed. Please make sure your credentials are correct and try again.");
            }
        } catch (err) {
            console.error("Error during login:", err);
            alert("An error occurred while trying to log in. Please try again later.");
        }
    });
}

// --- SIGN UP / ROLE SELECTION LOGIC ---
const roleSelectorBtn = document.getElementById("role_selector");
const roleSelect = document.getElementById("role");
const userRoleInput = document.getElementById("userrole");
const classHead = document.getElementById("classhead");
const classSelect = document.getElementById("_class");

if (roleSelectorBtn) {
    roleSelectorBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const selectedRole = roleSelect.value;
        if (selectedRole === "select_role") {
            alert("Please select a valid role first.");
            return;
        }
        
        userRoleInput.value = selectedRole;
        if (selectedRole === "student") {
            classHead.style.display = "block";
            classSelect.style.display = "block";
        } else {
            classHead.style.display = "none";
            classSelect.style.display = "none";
        }
        alert(`Role set to ${selectedRole}. Please fill out the rest of the form.`);
    });
}

const registrationForm = document.getElementById("registrationform");
if (registrationForm) {
    registrationForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const firstname = document.getElementById("first-name").value;
        const middlename = document.getElementById("middle-name").value;
        const lastname = document.getElementById("last-name").value;
        const email = document.getElementById("e-mail").value;
        const password = document.getElementById("user-password").value;
        const confirmPassword = document.getElementById("confirmpassword").value;
        const username = document.getElementById("user-name").value;
        const role = userRoleInput.value;
        const classname = classSelect.value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (!role) {
            alert("Please select and confirm your role using the role selector button.");
            return;
        }

        try {
            const response = await fetch(apiUrl('/api/register'), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
                alert("Registration successful! Redirecting you to sign in.");
                switchView('signin-section');
            } else {
                alert("Registration failed: " + data.message);
            }
        } catch (err) {
            console.error("Error during registration:", err);
            alert("An error occurred during registration. Please try again.");
        }
    });
}