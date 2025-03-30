// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const deptName = urlParams.get('dept');

// Set group name in header
document.getElementById('deptName').textContent = deptName;

// Toggle all accordions
function toggleAllAccordions() {
    const toggle = document.getElementById('toggleAllAccordions');
    const accordionItems = document.querySelectorAll('#questionsAccordionAdmin .accordion-collapse');
    
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

// Load questions on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Add toggle button event listener
    document.getElementById('toggleAllAccordions').addEventListener('change', toggleAllAccordions);
    // Ensure modal is hidden on page load
    modal.style.display = 'none';
    console.log("in question.js")
    
    try {
        const response = await fetch(`/api/questions?group=${encodeURIComponent(deptName)}`);
        const data = await response.json();

        console.log(data)
        
        if (response.ok) {
            renderQuestions(data);
        } else {
            console.error('Failed to load questions:', data.message);
        }
    } catch (error) {
        console.error('Error loading questions:', error);
    }
});

// Fetch medtest data and render questions
async function renderQuestions(departmentQuestions) {
    // Get medtest data
    //const medtestResponse = await fetch('../medtest.json');
    //const medtestData = await medtestResponse.json();
    
    // Find questions for selected department
    //const departmentQuestions = medtestData.questionGroups
    //    .find(group => group.dept === deptName)?.questions || [];
    
    const questionsAccordionAdmin = document.getElementById('questionsAccordionAdmin');
        
    questionsAccordionAdmin.innerHTML = departmentQuestions.map((question, index) => {
        const assessments = question.assessments || {};
        const firstAssessment = Object.values(assessments)[0] || {};
        
        return `
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
                    aria-labelledby="heading${index}" data-bs-parent="#questionsAccordionAdmin">
                <div class="accordion-body question-details">
                    <div>
                        <h5>【题目】：</h5>
                        <p>${question.text}</p>
                    </div>
                    <br>
                    <div class="assessment-controls">
                        <h5>【评委评价】：</h5>
                        <table style="border: 1px solid black; border-collapse: collapse; width: 100%;">
                            <tr>
                                <th style="border: 1px solid black; padding: 8px; text-align: center;">Difficulty</th>
                                <th style="border: 1px solid black; padding: 8px; text-align: center;">Rare Disease</th>
                            </tr>
                            <tr>
                                <td style="border: 1px solid black; padding: 8px; text-align: center;">
                                    ${firstAssessment.difficulty || 'Not set'}
                                </td>
                                <td style="border: 1px solid black; padding: 8px; text-align: center;">
                                    ${firstAssessment.rareDisease ? 'Yes' : 'No'}
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
                </div>
            </div>
        </div>    
    `}).join('');
}

// Modal handling
const modal = document.getElementById('addQuestionModal');
const addQuestionForm = document.getElementById('addQuestionForm');
const closeBtn = document.querySelector('.close');

// Open modal when add question is clicked
function addQuestion() {
    modal.style.display = 'block';
    // Center the modal
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.position = 'fixed';
    modalContent.style.top = '50%';
    modalContent.style.left = '50%';
    modalContent.style.transform = 'translate(-50%, -50%)';
    modalContent.style.zIndex = '1000';
}

// Close modal when X is clicked
closeBtn.onclick = function() {
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Handle form submission
addQuestionForm.onsubmit = function(e) {
    e.preventDefault();
    
    const text = document.getElementById('questionText').value;
    const type = document.getElementById('questionType').value;
    const answer = document.getElementById('answerText').value;
    
    if (text) {
        fetch('/api/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                group: deptName,
                text: text,
                type: type,
                answer: answer
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                modal.style.display = 'none';
                window.location.reload();
                addQuestionForm.reset();
            }
        });
    }
}

// Edit existing question
function editQuestion(index) {
    const newText = prompt('Edit the question:');
    if (newText) {
        fetch('/api/questions', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                group: deptName,
                index: index,
                text: newText,
                type: newType
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.reload();
            }
        });
    }
}

// Delete question
function deleteQuestion(index) {
    if (confirm('Are you sure you want to delete this question?')) {
        fetch('/api/questions', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                group: deptName,
                index: index
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.reload();
            }
        });
    }
}

// Navigation functions
function goBack() {
    window.location.href = '/admin';
}

function logout() {
    fetch('/logout', { method: 'POST' })
        .then(() => window.location.href = '/')
        .catch(err => console.error('Logout error:', err));
}