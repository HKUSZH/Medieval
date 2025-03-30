let currentDepartment = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the dashboard or questions page
    if (window.location.pathname === '/admin') {
        // On dashboard - highlight current department if any
        console.log("window.location.pathname:"+window.location.pathname)
        const urlParams = new URLSearchParams(window.location.search);
        const currentDepartment = urlParams.get('dept');
        console.log("urlParams:"+urlParams)
        
        if (currentDepartment) {
            const activeButton = document.querySelector(`.department-buttons button:contains('${currentDepartment}')`);
            if (activeButton) {
                activeButton.classList.add('active');
            }
        }
    }
});

function selectDepartment(department) {
    // Update button states
    document.querySelectorAll('.department-buttons button').forEach(button => {
        button.classList.remove('active');
        if (button.textContent === department) {
            button.classList.add('active');
        }
    });
    
    // Navigate to questions page
    window.location.href = `/admin/questions?dept=${encodeURIComponent(department)}`;
}

function editQuestion(id) {
    const newText = prompt('Edit the question:');
    if (newText) {
        fetch('/api/questions', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                group: currentDepartment,
                id: id,
                text: newText,
                type: newType
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                selectDepartment(currentDepartment); // Refresh questions
            }
        });
    }
}

function deleteQuestion(id) {
    if (confirm('Are you sure you want to delete this question?')) {
        fetch('/api/questions', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                group: currentDepartment,
                id: id
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                selectDepartment(currentDepartment); // Refresh questions
            }
        });
    }
}

function addQuestion() {
    const text = prompt('Enter the new question:');
    if (text) {
        fetch('/api/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                group: currentDepartment,
                text: text,
                type: type
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                selectDepartment(currentDepartment); // Refresh questions
            }
        });
    }
}

function logout() {
    fetch('/logout', { method: 'POST' })
        .then(() => window.location.href = '/')
        .catch(err => console.error('Logout error:', err));
}

async function generateRound1Summary() {
    try {
        // Load required data
        const [loginRes, medtestRes] = await Promise.all([
            // Try multiple possible paths for the JSON files
            fetch('/login.json').then(res => {
                if (!res.ok) throw new Error(`Login data fetch failed: ${res.status}`);
                return res.json();
            }),
            fetch('/medtest.json').then(res => {
                if (!res.ok) throw new Error(`Medtest data fetch failed: ${res.status}`);
                return res.json();
            })
        ]);
        const loginData = await loginRes;
        const medtestData = await medtestRes;
        
        // Get all reviewers
        const reviewers = loginData.users.filter(u => u.role === 'reviewer');
        console.log(reviewers)
        // Group reviewers by department
        const deptGroups = reviewers.reduce((groups, reviewer) => {
            const dept = reviewer.dept;
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(reviewer);
            return groups;
        }, {});
        
        // Generate table rows
        let tableHTML = `
            <table class="osce-table">
                <thead>
                    <tr>
                        <th>评委</th>
                        <th>科室</th>
                        <th colspan="4">难度</th>
                        <th colspan="3">涉罕</th>
                        <th colspan="3">涉诊</th>
                        <th colspan="3">涉治</th>
                        <th colspan="3">涉操</th>
                    </tr>
                    <tr>
                        <th></th>
                        <th></th>
                        <th>易</th>
                        <th>中</th>
                        <th>难</th>
                        <th>未评</th>
                        <th>Y</th>
                        <th>N</th>
                        <th>未评</th>
                        <th>Y</th>
                        <th>N</th>
                        <th>未评</th>
                        <th>Y</th>
                        <th>N</th>
                        <th>未评</th>
                        <th>Y</th>
                        <th>N</th>
                        <th>未评</th>
                    </tr>
                </thead>
                <tbody>`;
        
        // Process each department group
        for (const [dept, deptReviewers] of Object.entries(deptGroups)) {
            // Add department header
            tableHTML += `<tr class="dept-header"><td colspan="18"><strong>${dept}</strong></td></tr>`;
            
            // Process each reviewer
            for (const reviewer of deptReviewers) {
                const counts = {
                    difficulty: { easy: 0, medium: 0, hard: 0, unspecified: 0 },
                    diagnosis: { Y: 0, N: 0, unspecified: 0 },
                    treatment: { Y: 0, N: 0, unspecified: 0 },
                    procedure: { Y: 0, N: 0, unspecified: 0 },
                    rare: { Y: 0, N: 0, unspecified: 0 }
                };
                
                // Get total questions in reviewer's department
                const deptGroup = medtestData.questionGroups.find(g =>
                    g.dept.toLowerCase() === reviewer.dept.toLowerCase()
                );
                const totalQuestions = deptGroup?.questions.length || 0;

                // Count assessments across all questions
                for (const group of medtestData.questionGroups) {
                    for (const question of group.questions) {
                        const assessment = question.assessments?.[reviewer.email];
                        if (assessment) {
                            // Count difficulty
                            if (assessment.difficulty) {
                                counts.difficulty[assessment.difficulty]++;
                            }
                            
                            // Count diagnosis
                            if (assessment.diagnosis !== undefined) {
                                counts.diagnosis[assessment.diagnosis === 'true' ? 'Y' : 'N']++;
                            }
                            
                            // Count treatment
                            if (assessment.treatment !== undefined) {
                                counts.treatment[assessment.treatment === 'true' ? 'Y' : 'N']++;
                            }
                            
                            // Count procedure
                            if (assessment.procedure !== undefined) {
                                counts.procedure[assessment.procedure === 'true' ? 'Y' : 'N']++;
                            }

                            if (assessment.procedure !== undefined) {
                                counts.rare[assessment.rareDisease === 'true' ? 'Y' : 'N']++;
                            }
                        }
                    }
                }

                // Calculate unspecified counts
                counts.difficulty.unspecified = totalQuestions -
                    (counts.difficulty.easy + counts.difficulty.medium + counts.difficulty.hard);
                
                counts.diagnosis.unspecified = totalQuestions -
                    (counts.diagnosis.Y + counts.diagnosis.N);
                
                counts.treatment.unspecified = totalQuestions -
                    (counts.treatment.Y + counts.treatment.N);
                
                counts.procedure.unspecified = totalQuestions -
                    (counts.procedure.Y + counts.procedure.N);

                counts.rare.unspecified = totalQuestions -
                    (counts.rare.Y + counts.rare.N);
                
                // Add reviewer row
                tableHTML += `
                    <tr>
                        <td>&nbsp;&nbsp;&nbsp;&nbsp;${reviewer.name} 主任</td>
                        <td>${reviewer.dept}</td>
                        <td>${counts.difficulty.easy}</td>
                        <td>${counts.difficulty.medium}</td>
                        <td>${counts.difficulty.hard}</td>
                        <td>${counts.difficulty.unspecified}</td>
                        <td>${counts.diagnosis.Y}</td>
                        <td>${counts.diagnosis.N}</td>
                        <td>${counts.diagnosis.unspecified}</td>
                        <td>${counts.treatment.Y}</td>
                        <td>${counts.treatment.N}</td>
                        <td>${counts.treatment.unspecified}</td>
                        <td>${counts.procedure.Y}</td>
                        <td>${counts.procedure.N}</td>
                        <td>${counts.procedure.unspecified}</td>
                        <td>${counts.rare.Y}</td>
                        <td>${counts.rare.N}</td>
                        <td>${counts.rare.unspecified}</td>
                    </tr>`;
            }
        }
        
        tableHTML += '</tbody></table>';
        
        // Display the table
        document.getElementById('round1Summary').innerHTML = tableHTML;
    } catch (error) {
        console.error('Error generating summary:', error);
        alert('Failed to generate summary. Please try again.');
    }
}

async function generateRound2Summary() {
    try {
        // Load required data
        const [loginRes, scoresRes] = await Promise.all([
            // Try multiple possible paths for the JSON files
            fetch('/login.json').then(res => {
                if (!res.ok) throw new Error(`Login data fetch failed: ${res.status}`);
                return res.json();
            }),
            fetch('/scores.json').then(res => {
                if (!res.ok) throw new Error(`scores data fetch failed: ${res.status}`);
                return res.json();
            })
        ]);
        const loginData = await loginRes;
        const scoresData = await scoresRes;
        
        // Get all reviewers
        const reviewers = loginData.users.filter(u => u.role === 'reviewer');
        console.log(scoresData)
        const deptGroups = reviewers.reduce((groups, reviewer) => {
            const dept = reviewer.dept;
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(reviewer);
            return groups;
        }, {});

        let tableHTML = `
            <table class="osce-table">
                <thead>
                    <tr>
                        <th>评委</th>
                        <th>科室</th>
                        <th colspan="3">进度</th>
                        <th colspan="4">分数</th>
                        <th colspan="3">幻觉</th>
                        <th colspan="7">模型</th>
                    </tr>
                    <tr>
                        <th></th>
                        <th></th>
                        <th>已全评</th>
                        <th>部分评</th>
                        <th>未评</th>
                        <th>未评</th>
                        <th>≤3.5</th>
                        <th>4~6.5</th>
                        <th>7~8</th>
                        <th>≥8.5</th>
                        <th>≤0.5</th>
                        <th>1~2.5</th>
                        <th>≥2.5</th>
                        <th>GPT4o</th>
                        <th>DS671</th>
                        <th>DS70</th>
                        <th>DS32</th>
                        <th>QWEN32</th>
                        <th>QWEN max</th>
                        <th>Gemini 2</th>
                    </tr>
                </thead>
                <tbody>`;
        
        // Process each department group
        for (const [dept, deptReviewers] of Object.entries(deptGroups)) {
            // Add department header
            tableHTML += `<tr class="dept-header"><td colspan="18"><strong>${dept}</strong></td></tr>`;
            
            // Process each reviewer
            for (const reviewer of deptReviewers) {
                const counts = {
                    progress: { all: 0, partial: 0, none: 0 },
                    strength: { low: 0, medium: 0, midhigh: 0, great: 0 },
                    hallu: { minor: 0, medium: 0, severe: 0 },
                    models: { GPT4o: 0, DS671: 0, DS70: 0, DS32: 0, QWEN32: 0, QWENmax: 0, Gemini2: 0 }
                };
                
                // Get total questions in reviewer's department
                const deptGroup = medtestData.questionGroups.find(g =>
                    g.dept.toLowerCase() === reviewer.dept.toLowerCase()
                );
                const totalQuestions = deptGroup?.questions.length || 0;

                // Count assessments across all questions
                for (const QID of scoresData) {
                    for (const modelID of QID) {
                        for (const assessment of modelID) {
                            // const assessment = question.assessments?.[reviewer.email];
                            if (assessment) {
                                // Count difficulty
                                if (assessment.difficulty) {
                                    counts.difficulty[assessment.difficulty]++;
                                }
                                
                                // Count diagnosis
                                if (assessment.diagnosis !== undefined) {
                                    counts.diagnosis[assessment.diagnosis === 'true' ? 'Y' : 'N']++;
                                }
                                
                                // Count treatment
                                if (assessment.treatment !== undefined) {
                                    counts.treatment[assessment.treatment === 'true' ? 'Y' : 'N']++;
                                }
                                
                                // Count procedure
                                if (assessment.procedure !== undefined) {
                                    counts.procedure[assessment.procedure === 'true' ? 'Y' : 'N']++;
                                }

                                if (assessment.procedure !== undefined) {
                                    counts.rare[assessment.rareDisease === 'true' ? 'Y' : 'N']++;
                                }
                            }
                        }
                    }
                }

                // Calculate unspecified counts
                counts.difficulty.unspecified = totalQuestions -
                    (counts.difficulty.easy + counts.difficulty.medium + counts.difficulty.hard);
                
                counts.diagnosis.unspecified = totalQuestions -
                    (counts.diagnosis.Y + counts.diagnosis.N);
                
                counts.treatment.unspecified = totalQuestions -
                    (counts.treatment.Y + counts.treatment.N);
                
                counts.procedure.unspecified = totalQuestions -
                    (counts.procedure.Y + counts.procedure.N);

                counts.rare.unspecified = totalQuestions -
                    (counts.rare.Y + counts.rare.N);
                
                // Add reviewer row
                tableHTML += `
                    <tr>
                        <td>&nbsp;&nbsp;&nbsp;&nbsp;${reviewer.name} 主任</td>
                        <td>${reviewer.dept}</td>
                        <td>${counts.difficulty.easy}</td>
                        <td>${counts.difficulty.medium}</td>
                        <td>${counts.difficulty.hard}</td>
                        <td>${counts.difficulty.unspecified}</td>
                        <td>${counts.diagnosis.Y}</td>
                        <td>${counts.diagnosis.N}</td>
                        <td>${counts.diagnosis.unspecified}</td>
                        <td>${counts.treatment.Y}</td>
                        <td>${counts.treatment.N}</td>
                        <td>${counts.treatment.unspecified}</td>
                        <td>${counts.procedure.Y}</td>
                        <td>${counts.procedure.N}</td>
                        <td>${counts.procedure.unspecified}</td>
                        <td>${counts.rare.Y}</td>
                        <td>${counts.rare.N}</td>
                        <td>${counts.rare.unspecified}</td>
                    </tr>`;
            }
        }
        
        tableHTML += '</tbody></table>';
        
        // Display the table
        document.getElementById('round2Summary').innerHTML = tableHTML;

    } catch (error) {
        console.error('Error generating summary:', error);
        alert('Failed to generate summary. Please try again.');
    }
}