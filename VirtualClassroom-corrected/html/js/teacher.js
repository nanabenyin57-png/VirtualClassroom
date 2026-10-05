// Global DOM elements
const menu = document.getElementById('hamburgermenu');
const navigation = document.getElementById('navigation');
const classcontent = document.getElementById("classcontent");
const profilepicture = document.getElementById("profileimg");
const fileinput = document.getElementById("userprofile");

// Run once when DOM is fully loaded
window.addEventListener("DOMContentLoaded", () => {
    if (navigation) navigation.style.display = "none";

    // Load saved avatar from localStorage with cache buster and apiUrl base resolution
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.profileimg && profilepicture) {
        profilepicture.src = `${apiUrl(user.profileimg)}?t=${Date.now()}`;
    }

    // Initialize dashboard data loaders
    loadTeacherSubmissions();
    loadTeacherQuestions();
});

// Navigation Toggle
if (menu && navigation) {
    menu.addEventListener('click', () => {
        navigation.style.display = (navigation.style.display === "none") ? "block" : "none";
    });
}

// Helper to render roster into #classcontent
function displaystudents(students) {
    if (!classcontent) return;
    classcontent.innerHTML = ""; // Clear existing records

    if (!students || students.length === 0) {
        classcontent.innerHTML = "<p>No students enrolled in this class.</p>";
        return;
    }

    const list = document.createElement("ul");
    list.className = "student-list";

    students.forEach(student => {
        const item = document.createElement("li");
        const fullName = `${student.firstname} ${student.middlename ? student.middlename + ' ' : ''}${student.lastname}`;
        item.textContent = `${fullName} (ID: ${student.studid})`;
        list.appendChild(item);
    });

    classcontent.appendChild(list);
}

// Class Button Listeners
const classbuttons = document.querySelectorAll(".class-btn");
let activeclass = null;

classbuttons.forEach((button) => {
    button.addEventListener("click", async (e) => {
        e.preventDefault();
        const selectedclass = e.currentTarget.dataset.class;

        if (activeclass === selectedclass) {
            activeclass = null;
            if (classcontent) classcontent.style.display = "none";
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(apiUrl('/api/classlist'), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ classname: selectedclass })
            });

            const data = await response.json();

            if (data.success) {
                displaystudents(data.students);
                if (classcontent) classcontent.style.display = "block";
                activeclass = selectedclass;
            } else {
                alert("Class list could not be loaded: " + data.message);
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem("token");
                    window.location.href = "signin.html";
                }
            }
        } catch (err) {
            console.error("Error fetching class list:", err);
            alert("An error occurred while trying to fetch the class list.");
        }
    });
});

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

                if (profilepicture) {
                    profilepicture.src = `${apiUrl(data.imageUrl)}?t=${Date.now()}`;
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

// Robust Single Definition of loadTeacherSubmissions (Includes Grading Logic)
async function loadTeacherSubmissions() {
    const container = document.getElementById('submissionslistcontainer');
    if (!container) return;

    try {
        const token = localStorage.getItem("token");
        const response = await fetch(apiUrl('/api/teacher/submissions'), {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            if (data.submissions.length === 0) {
                container.innerHTML = '<p class="placeholder-text">No student submissions received yet.</p>';
                return;
            }

            let html = '<div class="feed-list-grid">';
            data.submissions.forEach(sub => {
                const dateStr = new Date(sub.submitted_at).toLocaleString();
                const isGraded = sub.score !== null && sub.score !== undefined;
                
                html += `
                    <div class="feed-item" data-submission-id="${sub.submission_id}">
                        <div class="feed-header">
                            <span class="topic-badge">${sub.subjectname} (${sub.classname.toUpperCase()})</span>
                            <span class="feed-date">${dateStr}</span>
                        </div>
                        <h3>${sub.assignment_title}</h3>
                        <p class="feed-author"><strong>Student:</strong> ${sub.firstname} ${sub.lastname} (${sub.email})</p>
                        <div class="feed-content-box" style="margin-bottom: 10px;">${sub.submission_content}</div>
                        
                        <div class="grading-section" style="background: #f1f5f9; padding: 10px; border-radius: 6px;">
                            <p><strong>Current Status:</strong> ${isGraded ? `<span style="color: green;">Graded (Score: ${sub.score})</span>` : '<span style="color: orange;">Pending Assessment</span>'}</p>
                            <div class="form-group" style="margin-top: 8px;">
                                <label>Score:</label>
                                <input type="number" class="input-text grade-score-input" value="${sub.score || ''}" placeholder="e.g., 85" style="width: 100px; display: inline-block; margin-right: 10px;" />
                            </div>
                            <div class="form-group" style="margin-top: 8px;">
                                <label>Remarks:</label>
                                <textarea class="assignmentarea grade-remarks-input" placeholder="Type feedback or remarks here...">${sub.remarks || ''}</textarea>
                            </div>
                            <button class="button4 action-btn submit-grade-btn" data-id="${sub.submission_id}" style="margin-top: 8px;">Send Score & Remarks</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;

            // Attach event listeners to grading buttons
            document.querySelectorAll('.submit-grade-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const submissionId = e.target.dataset.id;
                    const card = e.target.closest('.feed-item');
                    const score = card.querySelector('.grade-score-input').value;
                    const remarks = card.querySelector('.grade-remarks-input').value;

                    if (score === '') {
                        alert("Please enter a valid score.");
                        return;
                    }

                    try {
                        const gradeRes = await fetch(apiUrl('/api/teacher/grade-submission'), {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({ submission_id: submissionId, score: parseFloat(score), remarks })
                        });
                        const gradeData = await gradeRes.json();
                        if (gradeData.success) {
                            alert("Score and remarks sent successfully!");
                            loadTeacherSubmissions();
                        } else {
                            alert("Failed to grade: " + gradeData.message);
                        }
                    } catch (err) {
                        console.error("Grading error:", err);
                        alert("Network error while submitting grade.");
                    }
                });
            });
        } else {
            container.innerHTML = '<p class="placeholder-text" style="color: #ff8080;">Failed to load submissions.</p>';
        }
    } catch (err) {
        console.error("Error loading submissions:", err);
        container.innerHTML = '<p class="placeholder-text" style="color: #ff8080;">Error connecting to server.</p>';
    }
}

// Function to fetch and display student questions
async function loadTeacherQuestions() {
    const container = document.getElementById('questionslistcontainer');
    if (!container) return;

    try {
        const token = localStorage.getItem("token");
        const response = await fetch(apiUrl('/api/teacher/questions'), {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            if (data.questions.length === 0) {
                container.innerHTML = '<p class="placeholder-text">No student questions received yet.</p>';
                return;
            }

            let html = '<div class="feed-list-grid">';
            data.questions.forEach(q => {
                const dateStr = new Date(q.created_at).toLocaleString();
                html += `
                    <div class="feed-item">
                        <div class="feed-header">
                            <span class="topic-badge">${q.subjectname}</span>
                            <span class="feed-date">${dateStr}</span>
                        </div>
                        <h3>${q.title}</h3>
                        <p class="feed-author"><strong>From:</strong> ${q.firstname} ${q.lastname} (${q.email})</p>
                        <div class="feed-content-box">${q.content}</div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="placeholder-text" style="color: #ff8080;">Failed to load questions.</p>';
        }
    } catch (err) {
        console.error("Error loading questions:", err);
        container.innerHTML = '<p class="placeholder-text" style="color: #ff8080;">Error connecting to server.</p>';
    }
}

// Fetch and display topics dynamically via course_preview
const subjectDropdown = document.getElementById('notessubject');
const topicDropdown = document.getElementById('notestopic');
const topicsContentContainer = document.getElementById('topiccontentcontainer');

if (subjectDropdown && topicsContentContainer) {
    subjectDropdown.addEventListener('change', async (e) => {
        const selectedSubject = e.target.value;

        if (!selectedSubject) {
            if (topicDropdown) topicDropdown.innerHTML = '<option value="">-- Choose Topic First --</option>';
            topicsContentContainer.innerHTML = '<p style="color: #cbd5e1; font-style: italic;">Select a subject above to view its curriculum topics.</p>';
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl('/api/course_preview')}?subjectname=${encodeURIComponent(selectedSubject)}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });

            const data = await response.json();

            if (data && data.length > 0 && data[0].topics) {
                const rawTopics = data[0].topics;
                let topicsArray = [];
                if (typeof rawTopics === 'string') {
                    topicsArray = rawTopics.includes(',') 
                        ? rawTopics.split(',').map(t => t.trim()).filter(t => t.length > 0)
                        : rawTopics.split('\n').map(t => t.trim()).filter(t => t.length > 0);
                } else if (Array.isArray(rawTopics)) {
                    topicsArray = rawTopics;
                }

                if (topicsArray.length === 0) {
                    if (topicDropdown) topicDropdown.innerHTML = '<option value="">-- No Topics Available --</option>';
                    topicsContentContainer.innerHTML = '<p style="color: #cbd5e1; font-style: italic;">No topics available for this subject.</p>';
                    return;
                }

                if (topicDropdown) {
                    let topicOptionsHtml = '<option value="">-- Choose Topic --</option>';
                    topicsArray.forEach(topicTitle => {
                        topicOptionsHtml += `<option value="${topicTitle}">${topicTitle}</option>`;
                    });
                    topicDropdown.innerHTML = topicOptionsHtml;
                }

                let topicsHtml = `<div class="topics-list-grid">`;
                topicsArray.forEach((topicTitle, index) => {
                    topicsHtml += `
                        <div class="topic-item">
                            <span class="topic-badge">Module ${index + 1}</span>
                            <h3>${topicTitle}</h3>
                            <p>${data[0].preview || 'Curriculum module for ' + selectedSubject}.</p>
                        </div>
                    `;
                });
                topicsHtml += `</div>`;
                topicsContentContainer.innerHTML = topicsHtml;
            } else {
                if (topicDropdown) topicDropdown.innerHTML = '<option value="">-- No Topics Available --</option>';
                topicsContentContainer.innerHTML = `<p style="color: #ff8080;">No course preview found for this subject.</p>`;
            }
        } catch (err) {
            console.error("Error loading topics:", err);
            if (topicDropdown) topicDropdown.innerHTML = '<option value="">-- Error Loading Topics --</option>';
            topicsContentContainer.innerHTML = `<p style="color: #ff8080;">Could not load topics from server.</p>`;
        }
    });
}

// Give Assignment Handler
const giveAssignmentBtn = document.getElementById('giveassignment');

if (giveAssignmentBtn) {
    giveAssignmentBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const subjectname = document.getElementById('assignmentsubject').value;
        const classname = document.getElementById('assignmentclass').value;
        const title = document.getElementById('assignmenttitle').value;
        const content = document.getElementById('assignmenttextarea').value;

        if (!subjectname || !classname || !content) {
            alert("Please select a Subject, Class, and provide Assignment Instructions.");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(apiUrl('/api/add-assignment'), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ subjectname, classname, title, content })
            });

            const data = await response.json();

            if (data.success) {
                alert("Assignment successfully posted to the class!");
                document.getElementById('assignmentsubject').value = "";
                document.getElementById('assignmentclass').value = "";
                document.getElementById('assignmenttitle').value = "";
                document.getElementById('assignmenttextarea').value = "";
            } else {
                alert("Failed to post assignment: " + data.message);
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem("token");
                    window.location.href = "signin.html";
                }
            }
        } catch (err) {
            console.error("Error posting assignment:", err);
            alert("An error occurred while posting the assignment.");
        }
    });
}

// Standalone Curriculum Topics Subject Selector Handler
const curriculumSubjectDropdown = document.getElementById('curriculumsubject');

if (curriculumSubjectDropdown && topicsContentContainer) {
    curriculumSubjectDropdown.addEventListener('change', async (e) => {
        const selectedSubject = e.target.value;

        if (!selectedSubject) {
            topicsContentContainer.innerHTML = '<p style="color: #cbd5e1; font-style: italic;">Select a subject above to view its curriculum topics.</p>';
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl('/api/course_preview')}?subjectname=${encodeURIComponent(selectedSubject)}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });

            const data = await response.json();

            if (data && data.length > 0 && data[0].topics) {
                const rawTopics = data[0].topics;
                let topicsArray = [];
                if (typeof rawTopics === 'string') {
                    topicsArray = rawTopics.includes(',') 
                        ? rawTopics.split(',').map(t => t.trim()).filter(t => t.length > 0)
                        : rawTopics.split('\n').map(t => t.trim()).filter(t => t.length > 0);
                } else if (Array.isArray(rawTopics)) {
                    topicsArray = rawTopics;
                }

                if (topicsArray.length === 0) {
                    topicsContentContainer.innerHTML = '<p style="color: #cbd5e1; font-style: italic;">No topics available for this subject.</p>';
                    return;
                }

                let topicsHtml = `<div class="topics-list-grid">`;
                topicsArray.forEach((topicTitle, index) => {
                    topicsHtml += `
                        <div class="topic-item">
                            <span class="topic-badge">Module ${index + 1}</span>
                            <h3>${topicTitle}</h3>
                            <p>${data[0].preview || 'Curriculum module for ' + selectedSubject}.</p>
                        </div>
                    `;
                });
                topicsHtml += `</div>`;
                topicsContentContainer.innerHTML = topicsHtml;
            } else {
                topicsContentContainer.innerHTML = `<p style="color: #ff8080;">No course preview found for this subject.</p>`;
            }
        } catch (err) {
            console.error("Error loading curriculum topics:", err);
            topicsContentContainer.innerHTML = `<p style="color: #ff8080;">Could not load topics from server.</p>`;
        }
    });
}

// Navigation Buttons Handler
const studentDashboardBtn = document.getElementById('student-dashboard');
const logoutBtn = document.getElementById('logout');

if (studentDashboardBtn) {
    studentDashboardBtn.addEventListener('click', () => {
        const confirmation = window.confirm("Do you want to move to the student dashboard?");
        if (confirmation) window.location.href = 'student.html';
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        const confirmLogout = window.confirm("Do you want to log out?");
        if (confirmLogout) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        }
    });
}

// Send Class Notes Handler
const sendNotesBtn = document.getElementById('sendsavenotes');

if (sendNotesBtn) {
    sendNotesBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const subjectname = document.getElementById('notessubject').value;
        const topicname = document.getElementById('notestopic').value;
        const classname = document.getElementById('notesclass').value;
        const title = document.getElementById('notestitle').value;
        const content = document.getElementById('notestextarea').value;

        if (!subjectname || !topicname || !classname || !title || !content) {
            alert("Please fill in all fields (Subject, Topic, Class, Title, and Content) before sending.");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(apiUrl('/api/add-note'), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ subjectname, topicname, classname, title, content })
            });

            const data = await response.json();

            if (data.success) {
                alert("Notes successfully sent and linked to the topic!");
                document.getElementById('notessubject').value = "";
                if (topicDropdown) topicDropdown.innerHTML = '<option value="">-- Choose Topic First --</option>';
                document.getElementById('notesclass').value = "";
                document.getElementById('notestitle').value = "";
                document.getElementById('notestextarea').value = "";
                if (topicsContentContainer) {
                    topicsContentContainer.innerHTML = '<p style="color: #cbd5e1; font-style: italic;">Select a subject above to view its curriculum topics.</p>';
                }
            } else {
                alert("Failed to send notes: " + data.message);
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem("token");
                    window.location.href = "signin.html";
                }
            }
        } catch (err) {
            console.error("Error submitting notes:", err);
            alert("An error occurred while sending the notes.");
        }
    });
}

// AI Assistant Frontend Integration
const askAiBtn = document.getElementById("askai-btn");
const aiPromptInput = document.getElementById("aiprompt");
const aiResponseBox = document.getElementById("airesponsebox");
const aiResponseText = document.getElementById("airesponsetext");

if (askAiBtn) {
    askAiBtn.addEventListener("click", async () => {
        const prompt = aiPromptInput.value.trim();
        const token = localStorage.getItem("token");

        if (!prompt) {
            alert("Please enter a prompt for the AI Assistant.");
            return;
        }

        if (!token) {
            alert("Session expired. Please log in again.");
            window.location.href = "signin.html";
            return;
        }

        askAiBtn.disabled = true;
        askAiBtn.textContent = "Generating AI Response...";
        if (aiResponseBox) aiResponseBox.style.display = "block";
        if (aiResponseText) aiResponseText.textContent = "Thinking... Please wait.";

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
                if (aiResponseText) aiResponseText.textContent = data.answer;
            } else {
                if (aiResponseText) aiResponseText.textContent = "Error: " + (data.message || "Failed to generate response.");
            }
        } catch (err) {
            console.error("AI Network Error:", err);
            if (aiResponseText) aiResponseText.textContent = "Network error connecting to the AI assistant backend.";
        } finally {
            askAiBtn.disabled = false;
            askAiBtn.textContent = "Generate AI Response";
        }
    });
}