const menu = document.getElementById('hamburgermenu');
const navigation = document.getElementById('navigation');

// Run once when DOM is fully loaded
window.addEventListener("DOMContentLoaded", () => {
    navigation.style.display = "none";

    // Load saved avatar from localStorage
    const profilepicture = document.getElementById("profileimg");
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.profileimg && profilepicture) {
        profilepicture.src = `${user.profileimg}?t=${Date.now()}`;
    }

    // Load available assignments on boot
    loadStudentAssignments();
});

// Navigation Toggle
menu.addEventListener('click', () => {
    navigation.style.display = navigation.style.display === "none" ? "block" : "none";
});

// Profile Image Upload Handling
const fileinput = document.getElementById("userprofile");
const profilepicture = document.getElementById("profileimg");

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

// Load Assignments for Student
async function loadStudentAssignments() {
    const assignmentSelect = document.getElementById('studentassignmentselect');
    if (!assignmentSelect) return;

    try {
        const token = localStorage.getItem("token");
        const response = await fetch(apiUrl('/api/assignments'), {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();

        if (data && data.length > 0) {
            let optionsHtml = '<option value="">-- Choose Assignment --</option>';
            data.forEach(item => {
                optionsHtml += `<option value="${item.id}" data-content="${encodeURIComponent(item.content)}">${item.title} (${item.subjectname})</option>`;
            });
            assignmentSelect.innerHTML = optionsHtml;
        }
    } catch (err) {
        console.error("Error loading assignments:", err)
    }
}

// Handle Assignment Selection Details Display
const assignmentSelect = document.getElementById('studentassignmentselect');
const assignmentDetailsBox = document.getElementById('assignmentdetailsbox');

if (assignmentSelect && assignmentDetailsBox) {
    assignmentSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.selectedOptions[0];
        if (!selectedOption || !selectedOption.value) {
            assignmentDetailsBox.innerHTML = '<p class="placeholder-text">Select an assignment above to read instructions.</p>';
            return;
        }
        const rawContent = decodeURIComponent(selectedOption.dataset.content || '');
        assignmentDetailsBox.innerHTML = `<strong>Instructions:</strong><p>${rawContent}</p>`;
    });
}

// Submit Assignment Handler
const submitAssignmentBtn = document.getElementById('submitassignmentbtn');
if (submitAssignmentBtn) {
    submitAssignmentBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const assignmentId = assignmentSelect.value;
        const submissionContent = document.getElementById('nativesubmissiontextarea').value;

        if (!assignmentId || !submissionContent) {
            alert("Please select an assignment and write your submission answer.");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(apiUrl('/api/submit-assignment'), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ assignment_id: assignmentId, content: submissionContent })
            });

            const data = await response.json();
            if (data.success) {
                alert("Assignment submitted successfully!");
                document.getElementById('nativesubmissiontextarea').value = "";
                assignmentSelect.value = "";
                assignmentDetailsBox.innerHTML = '<p class="placeholder-text">Select an assignment above to read instructions.</p>';
            } else {
                alert("Submission failed: " + data.message);
            }
        } catch (err) {
            console.error("Error submitting assignment:", err)
            alert("An error occurred while submitting your assignment.");
        }
    });
}

// Load Class Notes for Student
const studentNotesSubject = document.getElementById('studentnotessubject');
const studentNotesContainer = document.getElementById('studentnotescontainer');

if (studentNotesSubject && studentNotesContainer) {
    studentNotesSubject.addEventListener('change', async (e) => {
        const subject = e.target.value;
        if (!subject) {
            studentNotesContainer.innerHTML = '<p class="placeholder-text">Select a subject to view teacher-uploaded study notes.</p>';
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl('/api/notes')}?subjectname=${encodeURIComponent(subject)}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();

            if (data && data.length > 0) {
                let html = '<div class="topics-list-grid">';
                data.forEach(note => {
                    html += `
                        <div class="topic-item">
                            <span class="topic-badge">${note.topicname || 'General'}</span>
                            <h3>${note.title}</h3>
                            <p>${note.content}</p>
                        </div>
                    `;
                });
                html += '</div>';
                studentNotesContainer.innerHTML = html;
            } else {
                studentNotesContainer.innerHTML = '<p style="color: #ff8080;">No class notes available for this subject.</p>';
            }
        } catch (err) {
            console.error("Error fetching notes:", err)
            studentNotesContainer.innerHTML = '<p style="color: #ff8080;">Could not retrieve class notes.</p>';
        }
    });
}

// Ask Question Handler
const sendQuestionBtn = document.getElementById('sendquestionbtn');
if (sendQuestionBtn) {
    sendQuestionBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const subjectname = document.getElementById('questionsubject').value;
        const title = document.getElementById('questiontitle').value;
        const content = document.getElementById('questiontextarea').value;

        if (!subjectname || !title || !content) {
            alert("Please fill in the subject, question title, and details.");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(apiUrl('/api/ask-question'), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ subjectname, title, content })
            });

            const data = await response.json();
            if (data.success) {
                alert("Your question has been sent to the teacher!");
                document.getElementById('questionsubject').value = "";
                document.getElementById('questiontitle').value = "";
                document.getElementById('questiontextarea').value = "";
            } else {
                alert("Failed to send question: " + data.message);
            }
        } catch (err) {
            console.error("Error sending question:", err)
            alert("An error occurred while sending your question.");
        }
    });
}

// Database Search Handler (Restricted to course_preview, assignments, classnotes tables)
const executeSearchBtn = document.getElementById('executesearch');
if (executeSearchBtn) {
    executeSearchBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const tableName = document.getElementById('searchtable').value;
        const query = document.getElementById('searchquery').value.trim();
        const resultsContainer = document.getElementById('searchresults');

        if (!query) {
            alert("Please enter keywords to search.");
            return;
        }

        resultsContainer.innerHTML = '<p class="placeholder-text">Searching database...</p>';

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl('/api/database-search')}?table=${encodeURIComponent(tableName)}&query=${encodeURIComponent(query)}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success && data.results && data.results.length > 0) {
                let html = '';
                data.results.forEach(row => {
                    html += `
                        <div class="search-result-item">
                            <h4>[${row.source_table || tableName}] ${row.title || row.subjectname || 'Record'}</h4>
                            <p>${row.content || row.preview || row.topics || JSON.stringify(row)}</p>
                        </div>
                    `;
                });
                resultsContainer.innerHTML = html;
            } else {
                resultsContainer.innerHTML = '<p style="color: #cbd5e1; font-style: italic;">No matching records found in course previews, assignments, or class notes.</p>';
            }
        } catch (err) {
            console.error("Search error:", err)
            resultsContainer.innerHTML = '<p style="color: #ff8080;">An error occurred while searching the database.</p>';
        }
    });
}

// Navigation Actions (Switching back to Teacher Dashboard or Logging Out)
const teacherDashboardBtn = document.getElementById('teacher-dashboard');
const logoutBtn = document.getElementById('logout');

if (teacherDashboardBtn) {
    teacherDashboardBtn.addEventListener('click', () => {
        if (window.confirm("Do you want to switch to the teacher dashboard?")) {
            window.location.href = 'teacher.html';
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (window.confirm("Do you want to log out?")) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        }
    });
}

// Student AI Assistant Frontend Integration
document.addEventListener("DOMContentLoaded", () => {
    const askStudentAiBtn = document.getElementById("askstudentai-btn");
    const studentAiPromptInput = document.getElementById("studentaiprompt");
    const studentAiResponseBox = document.getElementById("studentairesponsebox");
    const studentAiResponseText = document.getElementById("studentairesponsetext");

    if (askStudentAiBtn) {
        askStudentAiBtn.addEventListener("click", async () => {
            const prompt = studentAiPromptInput.value.trim();
            const token = localStorage.getItem("token");

            if (!prompt) {
                alert("Please enter a question for the AI Assistant.");
                return;
            }

            if (!token) {
                alert("Session expired. Please log in again.");
                window.location.href = "signin.html";
                return;
            }

            // Show loading state
            askStudentAiBtn.disabled = true;
            askStudentAiBtn.textContent = "Thinking...";
            studentAiResponseBox.style.display = "block";
            studentAiResponseText.textContent = "Searching course records and generating answer...";

            try {
                const response = await fetch(apiUrl('/api/ai-assistant'), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ prompt })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    studentAiResponseText.textContent = data.answer;
                } else {
                    studentAiResponseText.textContent = "Error: " + (data.message || "Failed to generate response.");
                }
            } catch (err) {
                console.error("AI Network Error:", err)
                studentAiResponseText.textContent = "Network error connecting to the AI assistant backend.";
            } finally {
                askStudentAiBtn.disabled = false;
                askStudentAiBtn.textContent = "Ask AI Assistant";
            }
        });
    }
});