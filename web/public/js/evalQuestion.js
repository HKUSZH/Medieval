let currentUser = null;
let department = null;

// Load user data and questions on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get email from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const email = urlParams.get('email');
        if (!email) {
            throw new Error('No email parameter found in URL');
        }

        // Fetch login data to get user details
        const loginResponse = await fetch('../login.json');
        const loginData = await loginResponse.json();
        const user = loginData.users.find(u => u.email === email);
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

        // Update back button with email parameter
        const backButton = document.querySelector('.back-button');
        backButton.href = `/reviewer?email=${encodeURIComponent(email)}`;

        // Get questions for user's department
        const questionsResponse = await fetch(`/api/questions?group=${encodeURIComponent(department)}`);
        const questions = await questionsResponse.json();

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
                        <div class="assessment-controls" style="background-color:rgb(218, 224, 151);">
                            <h5>【请评委点评本题】：</h5>
                            <table style="border: 1px solid black; border-collapse: collapse; width: 100%;">
                                <tr>
                                    <th style="border: 1px solid black; padding: 2px; text-align: center;">本题难度(必):</th>
                                    <th style="border: 1px solid black; padding: 2px; text-align: center;">涉及罕见病？(必)</th>
                                    <th style="border: 1px solid black; padding: 2px; text-align: center;">涉及诊断？(必)</th>
                                    <th style="border: 1px solid black; padding: 2px; text-align: center;">涉及治疗？(必)</th>
                                    <th style="border: 1px solid black; padding: 2px; text-align: center;">涉及操作？(必)</th>
                                    <th style="border: 1px solid black; padding: 2px; text-align: center;">补充意见(选)</th>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid black; padding: 8px; text-align: center;">
                                        <span style="display: inline-block; margin-right: 10px; text-align: center;">
                                            <input type="radio" name="difficulty-${question.QID}" value="easy" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.difficulty === 'easy' ? 'checked' : ''}> 易
                                        </span>
                                        <span style="display: inline-block; margin-right: 10px; text-align: center;">
                                            <input type="radio" name="difficulty-${question.QID}" value="medium" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.difficulty === 'medium' ? 'checked' : ''}> 中
                                        </span>
                                        <span style="display: inline-block; text-align: center;">
                                            <input type="radio" name="difficulty-${question.QID}" value="hard" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.difficulty === 'hard' ? 'checked' : ''}> 难
                                        </span>
                                    </td>
                                    <td style="border: 1px solid black; padding: 8px; text-align: center;">
                                        <span style="display: inline-block; text-align: center;">
                                            <input type="radio" name="diagnosis-${question.QID}" value="true" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.diagnosis === 'true' ? 'checked' : ''}> 是
                                        </span>
                                        <span style="display: inline-block; text-align: center;">
                                            <input type="radio" name="diagnosis-${question.QID}" value="false" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.diagnosis === 'false' ? 'checked' : ''}> 否
                                        </span>
                                    </td>
                                    <td style="border: 1px solid black; padding: 8px; text-align: center;">
                                        <span style="display: inline-block; text-align: center;">
                                            <input type="radio" name="treatment-${question.QID}" value="true" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.treatment === 'true' ? 'checked' : ''}> 是
                                        </span>
                                        <span style="display: inline-block; text-align: center;">
                                            <input type="radio" name="treatment-${question.QID}" value="false" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.treatment === 'false' ? 'checked' : ''}> 否
                                        </span>
                                    </td>
                                    <td style="border: 1px solid black; padding: 8px; text-align: center;">
                                        <span style="display: inline-block; text-align: center;">
                                            <input type="radio" name="procedure-${question.QID}" value="true" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.procedure === 'true' ? 'checked' : ''}> 是
                                        </span>
                                        <span style="display: inline-block; text-align: center;">
                                            <input type="radio" name="procedure-${question.QID}" value="false" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.procedure === 'false' ? 'checked' : ''}> 否
                                        </span>
                                    </td>
                                    <td style="border: 1px solid black; padding: 8px; text-align: center;">
                                        <span style="display: inline-block; text-align: center;">
                                            <input type="radio" name="rare-disease-${question.QID}" value="true" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.rareDisease === 'true' ? 'checked' : ''}> 是
                                        </span>
                                        <span style="display: inline-block; text-align: center;">
                                            <input type="radio" name="rare-disease-${question.QID}" value="false" onchange="saveAssessment('${question.QID}')"
                                                ${question.assessments?.[currentUser]?.rareDisease === 'false' ? 'checked' : ''}> 否
                                        </span>
                                    </td>
                                    <td style="border: 1px solid black; padding: 8px; text-align: center;">
                                        <input type="text" name="comment-${question.QID}" onchange="saveAssessment('${question.QID}')"
                                                value="${question.assessments?.[currentUser]?.comment || ''}">                                             
                                    </td>
                                </tr>
                            </table><br>
                        </div>
                        <br>
                        <div>
                            <h5>【参考答案】：</h5>
                            <p>${question.answer}</p>
                        </div>
                        <br>
                        <br>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading evaluation questions:', error);
        alert('Failed to load evaluation questions. Please try again.');
    }
});

// Save assessment
async function saveAssessment(questionId) {
    try {
        const difficulty = document.querySelector(`input[name="difficulty-${questionId}"]:checked`)?.value;
        const diagnosis = document.querySelector(`input[name="diagnosis-${questionId}"]:checked`)?.value;
        const treatment = document.querySelector(`input[name="treatment-${questionId}"]:checked`)?.value;
        const procedure = document.querySelector(`input[name="procedure-${questionId}"]:checked`)?.value;
        const rareDisease = document.querySelector(`input[name="rare-disease-${questionId}"]:checked`)?.value;
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
                diagnosis: diagnosis,
                treatment: treatment,
                procedure: procedure,
                rareDisease: rareDisease,
                user: currentUser,
                comment: comment
            })
        });
    } catch (error) {
        console.error('Error saving assessment:', error);
    }
}

// Toggle all accordions
document.getElementById('toggleAllAccordions').addEventListener('change', (e) => {
    const collapses = document.querySelectorAll('.accordion-collapse');
    const isChecked = e.target.checked;
    
    collapses.forEach(collapse => {
        const bsCollapse = new bootstrap.Collapse(collapse, {
            toggle: false
        });
        if (isChecked) {
            bsCollapse.show();
        } else {
            bsCollapse.hide();
        }
    });
});

// Get unanswered questions
async function getUnansweredQuestions() {
    try {
        const questionsResponse = await fetch(`/api/questions?group=${encodeURIComponent(department)}`);
        const questions = await questionsResponse.json();
        
        const unanswered = [];
        questions.forEach((question, index) => {
            const assessment = question.assessments?.[currentUser];
            if (!assessment ||
                !assessment.difficulty ||
                assessment.diagnosis === undefined ||
                assessment.treatment === undefined ||
                assessment.procedure === undefined ||
                assessment.rareDisease === undefined) {
                unanswered.push(index + 1);
            }
        });
        
        return unanswered;
    } catch (error) {
        console.error('Error getting unanswered questions:', error);
        return [];
    }
}

// Validate all questions answered before navigation
async function validateAllQuestionsAnswered(navigateCallback) {
    const unanswered = await getUnansweredQuestions();
    if (unanswered.length > 0) {
        alert(`请先完成以下问题的评分：\n第${unanswered.join(',')}题。`);
        return false;
    }
    return true;
}

// Logout function
async function logout() {
    const canLogout = await validateAllQuestionsAnswered(() => {
        fetch('/logout', { method: 'POST' })
            .then(() => window.location.href = '/')
            .catch(err => console.error('Logout error:', err));
    });
    
    if (canLogout) {
        fetch('/logout', { method: 'POST' })
            .then(() => window.location.href = '/')
            .catch(err => console.error('Logout error:', err));
    }
}

// Handle back button click
document.getElementById('backButton').addEventListener('click', async function() {
    const unanswered = await getUnansweredQuestions();
    if (unanswered.length > 0) {
        alert(`请先完成以下问题的评分：\n第${unanswered.join(',')}题。`);
    } else {
        const email = new URLSearchParams(window.location.search).get('email');
        window.location.href = `/reviewer?email=${encodeURIComponent(email)}`;
    }
});