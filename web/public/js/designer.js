let currentUser = null;
let department = null;

// Toggle all accordions
function toggleAllAccordions() {
    const toggle = document.getElementById('toggleAllAccordions');
    const accordionItems = document.querySelectorAll('#questionsAccordion .accordion-collapse');
    
    if (toggle.checked) {
        accordionItems.forEach(item => {
            new bootstrap.Collapse(item, { show: true });
        });
    } else {
        accordionItems.forEach(item => {
            new bootstrap.Collapse(item, { hide: true });
        });
    }
}

// Load user data and questions on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Add toggle button event listener
    document.getElementById('toggleAllAccordions').addEventListener('change', toggleAllAccordions);
    console.log("in designer.js")
    try {
        // Get email from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const email = urlParams.get('email');
        console.log("email:"+email)
        if (!email) {
            throw new Error('No email parameter found in URL');
        }

        // Fetch login data to get user details
        const loginResponse = await fetch('../login.json');
        const loginData = await loginResponse.json();
        const user = loginData.users.find(u => u.email === email);
        console.log("user:"+user)
        console.log("loginResponse:"+loginResponse)
        if (!user) {
            throw new Error('User not found in login data');
        }

        // Set user info
        currentUser = user.email;
        department = user.dept || 'General';
        profilePic = user.pic;
        examiner = user.designer;

        const imageElement = document.getElementById('profilePic');
        imageElement.src = profilePic;
        
        // Display user info
        document.getElementById('reviewerName').textContent = user.name || 'Unknown';
        document.getElementById('reviewerEmail').textContent = user.email;
        document.getElementById('reviewerDepartment').textContent = department;
        document.getElementById('reviewerExaminer').textContent = examiner;
        

        // Get questions for user's department
        const questionsResponse = await fetch(`/api/questions?group=${encodeURIComponent(department)}`);
        const questions = await questionsResponse.json();

        //const firstTwentyChars = ;
        // Display questions in collapsible sections
        const questionsAccordion = document.getElementById('questionsAccordion');
        questionsAccordion.innerHTML = questions.map((question, index) => `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading${index}">
                    <button class="accordion-button collapsed" type="button"
                            data-bs-toggle="collapse" data-bs-target="#collapse${index}"
                            aria-expanded="false" aria-controls="collapse${index}">
                        <div class="question-header">
                            <span>Q${index + 1}</span>
                            <span>QID: ${question.QID}</span>
                            <span>题型: ${question.type}</span>
                            <span>内容: ${question.text.slice(0, 20)}..</span>                            
                        </div>
                    </button>
                </h2>
                <div id="collapse${index}" class="accordion-collapse collapse"
                     aria-labelledby="heading${index}" data-bs-parent="#questionsAccordion">
                    <div class="accordion-body question-details">
                        <div>
                            <h5>【题目】：</h5>
                            <p>${question.text}</p>
                        </div>
                        <br>
                        <div>
                            <h5>【参考答案】：</h5>
                            <p>${question.answer}</p>
                        </div>
                        <!--<div class="assessment-controls">
                            <table style="border: 1px solid black; border-collapse: collapse; width: 100%;">
                                <tr>
                                    <th style="border: 1px solid black; padding: 8px; text-align: center;">请评价本题难度:</th>
                                    <th style="border: 1px solid black; padding: 8px; text-align: center;">是否涉及罕见病:</th>
                                    <th style="border: 1px solid black; padding: 8px; text-align: center;">补充意见</th>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid black; padding: 8px; text-align: center; width: 40%">
                                        <span style="display: inline-block; margin-right: 10px; text-align: center;">
                                            <input type="radio" name="difficulty-${question.QID}" value="easy" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.difficulty === 'easy' ? 'checked' : ''}> Easy 易
                                        </span>
                                        <span style="display: inline-block; margin-right: 10px; text-align: center;">
                                            <input type="radio" name="difficulty-${question.QID}" value="medium" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.difficulty === 'medium' ? 'checked' : ''}> Medium 中
                                        </span>
                                        <span style="display: inline-block; text-align: center;">
                                            <input type="radio" name="difficulty-${question.QID}" value="hard" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.difficulty === 'hard' ? 'checked' : ''}> Hard 难
                                        </span>
                                    </td>
                                    <td style="border: 1px solid black; padding: 8px; text-align: center; width: 20%">
                                        <input type="checkbox" name="rare-disease-${question.QID}" onchange="saveAssessment('${question.QID}')"
                                            ${question.assessments?.[currentUser]?.rareDisease ? 'checked' : ''}>
                                    </td>
                                    <td style="border: 1px solid black; padding: 8px; text-align: center;">
                                        <input type="text" name="comment-${question.QID}" onchange="saveAssessment('${question.QID}')"
                                                value="${question.assessments?.[currentUser]?.comment || ''}"   >                                             
                                    </td>
                                </tr>
                            </table><br>
                        </div>
                        <button class="btn btn-primary"
                                onclick="reviewQuestion('${question.QID}')">
                             对本考题LLM答案进行评价
                        </button>-->
                        <br>
                        <br>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading reviewer dashboard:', error);
        alert('Failed to load reviewer dashboard. Please try again.');
    }
});

function reviewQuestion(questionId) {
    // Get current user info
    const email = currentUser;
    const dept = department;
    
    // Navigate to score page with parameters
    window.location.href = `/score.html?email=${encodeURIComponent(email)}&dept=${encodeURIComponent(dept)}&QID=${encodeURIComponent(questionId)}`;
}

// Render questions with assessment controls
function renderQuestions(questions) {
    const container = document.querySelector('.question-list');
    container.innerHTML = questions.map((question, index) => `
        <div class="question-item">
            <div class="question-meta">
                <span class="question-id">ID: ${question.id}</span>
                <span class="question-department">Department: ${department}</span>
            </div>
            <div class="question-text">${question.text}</div>
            <div class="assessment-controls">
                <tabular>
                    <tr>
                        <td>
                            <input type="radio" name="difficulty-${question.id}" value="easy"
                                ${question.assessments[currentUser]?.difficulty === 'easy' ? 'checked' : ''}>
                            Easy
                        </td>
                        <td>
                            <input type="radio" name="difficulty-${question.id}" value="medium"
                                ${question.assessments[currentUser]?.difficulty === 'medium' ? 'checked' : ''}>
                            Medium
                        </td>
                        <td>
                            <input type="radio" name="difficulty-${question.id}" value="hard"
                                ${question.assessments[currentUser]?.difficulty === 'hard' ? 'checked' : ''}>
                            Hard
                        </td>
                    </tr>
                </tabular>
            </div>
        </div>
    `).join('');

    // Add event listeners for auto-save
    document.querySelectorAll('.assessment-controls input[type="radio"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const questionId = e.target.name.split('-')[1];
            console.log(questionId)
            saveAssessment(questionId);
        });
    });
}

// Save assessment
async function saveAssessment(questionId) {
    try {
        const difficulty = document.querySelector(`input[name="difficulty-${questionId}"]:checked`)?.value;
        const rareDisease = document.querySelector(`input[name="rare-disease-${questionId}"]`)?.checked;
        //const comment = document.querySelector(`input[name="comment-${questionId}"]:checked`)?.value;
        const comment = document.querySelector(`input[name="comment-${questionId}"]`)?.value;

        await fetch('/api/assessments', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                dept: department,
                questionId: questionId,
                difficulty: difficulty,
                rareDisease: rareDisease,
                user: currentUser,
                comment: comment
            })
        });
    } catch (error) {
        console.error('Error saving assessment:', error);
    }
}

// Logout function
function logout() {
    fetch('/logout', { method: 'POST' })
        .then(() => window.location.href = '/')
        .catch(err => console.error('Logout error:', err));
}