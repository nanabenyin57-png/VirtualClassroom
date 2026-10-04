// Global DOM elements & references
const menu = document.getElementById('hamburgermenu');
const navigation = document.getElementById('navigation');
const profilepicture = document.getElementById("profileimg");
const fileinput = document.getElementById("userprofile");
const assignmentSelect = document.getElementById('studentassignmentselect');
const assignmentDetailsBox = document.getElementById('assignmentdetailsbox');
const submitAssignmentBtn = document.getElementById('submitassignmentbtn');
const studentNotesSubject = document.getElementById('studentnotessubject');
const studentNotesContainer = document.getElementById('studentnotescontainer');
const sendQuestionBtn = document.getElementById('sendquestionbtn');
const executeSearchBtn = document.getElementById('executesearch');
const teacherDashboardBtn = document.getElementById('teacher-dashboard');
const logoutBtn = document.getElementById('logout');

// Run once when DOM is fully loaded (Unified Initialization)
window.addEventListener("DOMContentLoaded", () => {
    if (navigation) navigation.style.display = "none";

    // Load saved avatar from localStorage with cache buster
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.profileimg && profilepicture) {
        profilepicture.src = `${user.profileimg}?t=${Date.now()}`;
    }

    // Initialize student dashboard data loaders
    loadStudentAssignments();
    loadStudentGrades();
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

// Load Student Grades & Remarks
async function loadStudentGrades() {
    const container = document.getElementById('studentgradescontainer');
    if (!container) return;

    try {
        const token = localStorage.getItem("token");
        const response = await fetch(apiUrl('/api/student/grades'), {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            if (data.grades.length === 0) {
                container.innerHTML = '<p class="placeholder-text">No assignments submitted yet.</p>';
                return;
            }

            let html = '<div class="feed-list-grid">';
            data.grades.forEach(item => {
                const dateStr = new Date(item.submitted_at).toLocaleString();
                const hasScore = item.score !== null && item.score !== undefined;

                html += `
                    <div class="feed-item">
                        <div class="feed-header">
                            <span class="topic-badge">${item.subjectname}</span>
                            <span class="feed-date">Submitted: ${dateStr}</span>
                        </div>
                        <h3>${item.assignment_title}</h3>
                        <p><strong>Your Answer:</strong> ${item.submission_content}</p>
                        <div style="margin-top: 10px; background: #f8fafc; padding: 10px; border-radius: 6px; border-left: 4px solid ${hasScore ? '#10b981' : '#f59e0b'};">
                            <p><strong>Score:</strong> ${hasScore ? `<span style="color: #10b981; font-weight: bold;">${item.score}</span>` : '<span style="color: #f59e0b;">Pending Teacher Evaluation</span>'}</p>
                            <p><strong>Teacher Remarks:</strong> ${item.remarks || 'No remarks provided yet.'}</p>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="placeholder-text" style="color: #ff8080;">Could not load grades.</p>';
        }
    } catch (err) {
        console.error("Error loading grades:", err);
        container.innerHTML = '<p class="placeholder-text" style="color: #ff8080;">Network error loading grades.</p>';
    }
}

// Load Assignments for Student Dropdown
async function loadStudentAssignments() {
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
        console.error("Error loading assignments:", err);
    }
}

// Handle Assignment Selection Details Display
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
if (submitAssignmentBtn) {
    submitAssignmentBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const assignmentId = assignmentSelect ? assignmentSelect.value : '';
        const submissionTextArea = document.getElementById('nativesubmissiontextarea');
        const submissionContent = submissionTextArea ? submissionTextArea.value : '';

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
                if (submissionTextArea) submissionTextArea.value = "";
                if (assignmentSelect) assignmentSelect.value = "";
                if (assignmentDetailsBox) assignmentDetailsBox.innerHTML = '<p class="placeholder-text">Select an assignment above to read instructions.</p>';
                loadStudentGrades(); // Refresh grades view
            } else {
                alert("Submission failed: " + data.message);
            }
        } catch (err) {
            console.error("Error submitting assignment:", err);
            alert("An error occurred while submitting your assignment.");
        }
    });
}

// Load Class Notes for Student
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
            console.error("Error fetching notes:", err);
            studentNotesContainer.innerHTML = '<p style="color: #ff8080;">Could not retrieve class notes.</p>';
        }
    });
}

// Ask Question Handler
if (sendQuestionBtn) {
    sendQuestionBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const subjectnameInput = document.getElementById('questionsubject');
        const questionTitleInput = document.getElementById('questiontitle');
        const questionTextArea = document.getElementById('questiontextarea');

        const subjectname = subjectnameInput ? subjectnameInput.value : '';
        const title = questionTitleInput ? questionTitleInput.value : '';
        const content = questionTextArea ? questionTextArea.value : '';

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
                if (subjectnameInput) subjectnameInput.value = "";
                if (questionTitleInput) questionTitleInput.value = "";
                if (questionTextArea) questionTextArea.value = "";
            } else {
                alert("Failed to send question: " + data.message);
            }
        } catch (err) {
            console.error("Error sending question:", err);
            alert("An error occurred while sending your question.");
        }
    });
}

// Database Search Handler
if (executeSearchBtn) {
    executeSearchBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const searchTableInput = document.getElementById('searchtable');
        const searchQueryInput = document.getElementById('searchquery');
        const resultsContainer = document.getElementById('searchresults');

        const tableName = searchTableInput ? searchTableInput.value : '';
        const query = searchQueryInput ? searchQueryInput.value.trim() : '';

        if (!query) {
            alert("Please enter keywords to search.");
            return;
        }

        if (resultsContainer) {
            resultsContainer.innerHTML = '<p class="placeholder-text">Searching database...</p>';
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl('/api/database-search')}?table=${encodeURIComponent(tableName)}&query=${encodeURIComponent(query)}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();

            if (resultsContainer) {
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
            }
        } catch (err) {
            console.error("Search error:", err);
            if (resultsContainer) {
                resultsContainer.innerHTML = '<p style="color: #ff8080;">An error occurred while searching the database.</p>';
            }
        }
    });
}

// Navigation Actions (Switching back to Teacher Dashboard or Logging Out)
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
            const prompt = studentAiPromptInput ? studentAiPromptInput.value.trim() : '';
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

            askStudentAiBtn.disabled = true;
            askStudentAiBtn.textContent = "Thinking...";
            if (studentAiResponseBox) studentAiResponseBox.style.display = "block";
            if (studentAiResponseText) studentAiResponseText.textContent = "Searching course records and generating answer...";

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
                    if (studentAiResponseText) studentAiResponseText.textContent = data.answer;
                } else {
                    if (studentAiResponseText) studentAiResponseText.textContent = "Error: " + (data.message || "Failed to generate response.");
                }
            } catch (err) {
                console.error("AI Network Error:", err);
                if (studentAiResponseText) studentAiResponseText.textContent = "Network error connecting to the AI assistant backend.";
            } finally {
                askStudentAiBtn.disabled = false;
                askStudentAiBtn.textContent = "Ask AI Assistant";
            }
        });
    }
});