// Define apiUrl helper to resolve "apiUrl is not defined"
function apiUrl(endpoint) {
    // If your backend runs on a separate port (e.g. http://localhost:5000), prefix it here.
    // If served together, returning the endpoint directly is correct.
    return endpoint;
}

// Global DOM elements & references
const menu = document.getElementById('hamburgermenu');
const navigation = document.getElementById('navigation');
const profilepicture = document.getElementById("profileimg");
const fileinput = document.getElementById("userprofile");
const addNoteBtn = document.getElementById('addnotebtn');
const adminNotesSubject = document.getElementById('adminnotessubject');
const adminNotesContainer = document.getElementById('adminnotescontainer');
const logoutBtn = document.getElementById('logout');

// Run once when DOM is fully loaded (Unified Initialization)
window.addEventListener("DOMContentLoaded", () => {
    if (navigation) navigation.style.display = "none";

    // Load saved avatar from localStorage with cache buster & file:// security check
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.profileimg && profilepicture) {
        if (user.profileimg.startsWith("file:///")) {
            // Clear invalid local file paths from storage to prevent security errors
            user.profileimg = "";
            localStorage.setItem("user", JSON.stringify(user));
            profilepicture.src = "images/default-avatar.png";
        } else {
            profilepicture.src = `${user.profileimg}?t=${Date.now()}`;
        }
    }

    // Initialize admin records/notes view if container exists
    loadAdminNotes();
});

// Navigation Toggle
if (menu && navigation) {
    menu.addEventListener('click', () => {
        navigation.style.display = (navigation.style.display === "none") ? "block" : "none";
    });
}

// Profile Image Upload Handling
if (fileinput) {
    fileinput.addEventListener("change", async (event) => {
        event.preventDefault();
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("profileimg", file);
        const token = localStorage.getItem("token");

        try {
            const response = await fetch(apiUrl('/api/upload-profile-image'), {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error("Failed to upload profile image");

            const data = await response.json();
            if (data.success) {
                const user = JSON.parse(localStorage.getItem("user")) || {};
                user.profileimg = data.imageUrl;
                localStorage.setItem("user", JSON.stringify(user));
                if (profilepicture) profilepicture.src = `${data.imageUrl}?t=${Date.now()}`;
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

// Add Note Handler
if (addNoteBtn) {
    addNoteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const subjectInput = document.getElementById('adminnotessubject');
        const titleInput = document.getElementById('notetitle');
        const contentInput = document.getElementById('notecontent');

        const subjectname = subjectInput ? subjectInput.value : '';
        const title = titleInput ? titleInput.value.trim() : '';
        const content = contentInput ? contentInput.value.trim() : '';

        if (!subjectname || !title || !content) {
            alert("Please fill in all fields (subject, title, and content) to add a note.");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(apiUrl('/api/admin/notes'), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ subjectname, title, content })
            });

            const data = await response.json();
            if (data.success) {
                alert("Note added successfully!");
                if (titleInput) titleInput.value = "";
                if (contentInput) contentInput.value = "";
                loadAdminNotes();
            } else {
                alert("Failed to add note: " + data.message);
            }
        } catch (err) {
            console.error("Error adding note:", err);
            alert("An error occurred while saving the note.");
        }
    });
}

// Load Admin Notes / Records
async function loadAdminNotes() {
    const container = document.getElementById('adminnotescontainer');
    if (!container) return;

    try {
        const token = localStorage.getItem("token");
        const response = await fetch(apiUrl('/api/admin/notes'), {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            if (data.notes.length === 0) {
                container.innerHTML = '<p class="placeholder-text">No notes or records found.</p>';
                return;
            }

            let html = '<div class="feed-list-grid">';
            data.notes.forEach(note => {
                html += `
                    <div class="feed-item">
                        <div class="feed-header">
                            <span class="topic-badge">${note.subjectname}</span>
                            <span class="feed-date">${new Date(note.created_at || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <h3>${note.title}</h3>
                        <p>${note.content}</p>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="placeholder-text" style="color: #ff8080;">Could not load admin notes.</p>';
        }
    } catch (err) {
        console.error("Error loading admin notes:", err);
        container.innerHTML = '<p class="placeholder-text" style="color: #ff8080;">Network error loading admin notes.</p>';
    }
}

// Logout Action
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (window.confirm("Do you want to log out?")) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        }
    });
}