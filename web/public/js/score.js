class ScorePage {
    constructor() {
        this.currentQuestionIndex = 0;
        this.questions = [];
        this.currentUser = null;
        this.department = null;
        this.autoSaveInterval = null;
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.currentUser = urlParams.get('email');
        this.department = urlParams.get('dept');
        
        // Initialize
        this.init();
    }

    async init() {
        // Load user info
        document.getElementById('reviewerName').textContent = this.currentUser;
        document.getElementById('reviewerEmail').textContent = this.currentUser;
        document.getElementById('reviewerDepartment').textContent = this.department;

        // Load questions
        await this.loadQuestions();
        this.showQuestion();

        // Setup event listeners
        document.getElementById('prevQuestion').addEventListener('click', () => this.prevQuestion());
        document.getElementById('nextQuestion').addEventListener('click', () => this.nextQuestion());
        
        // Setup auto-save
        this.autoSaveInterval = setInterval(() => this.saveScores(), 30000);
        
        // Setup input change listeners
        document.querySelectorAll('input[type="radio"]').forEach(input => {
            input.addEventListener('change', () => this.saveScores());
        });
    }

    async loadQuestions() {
        try {
            const response = await fetch('/medtest.json');
            const data = await response.json();
            this.questions = data.questionGroups
                .find(g => g.name === this.department)
                .questions;
        } catch (error) {
            console.error('Error loading questions:', error);
        }
    }

    showQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        if (!question) return;

        // Update question display
        document.getElementById('questionId').textContent = question.QID;
        document.getElementById('questionText').textContent = question.text;

        // Update scores if they exist
        if (question.assessments && question.assessments[this.currentUser]) {
            const assessment = question.assessments[this.currentUser];
            document.querySelector(`input[name="difficulty"][value="${assessment.difficulty}"]`).checked = true;
            document.querySelector(`input[name="isRare"][value="${assessment.isRare}"]`).checked = true;
        }
    }

    async saveScores() {
        const question = this.questions[this.currentQuestionIndex];
        if (!question) return;

        const difficulty = document.querySelector('input[name="difficulty"]:checked')?.value;
        const isRare = document.querySelector('input[name="isRare"]:checked')?.value;

        if (!difficulty || !isRare) return;

        // Update local state
        if (!question.assessments) question.assessments = {};
        question.assessments[this.currentUser] = {
            difficulty,
            isRare,
            timestamp: new Date().toISOString()
        };

        // Save to server
        try {
            await fetch('/api/save-assessment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    QID: question.QID,
                    department: this.department,
                    assessment: question.assessments[this.currentUser]
                })
            });
            this.showStatus('Saved successfully');
        } catch (error) {
            console.error('Error saving assessment:', error);
            this.showStatus('Error saving assessment');
        }
    }

    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showQuestion();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.showQuestion();
        }
    }

    showStatus(message) {
        const status = document.getElementById('statusMessage');
        status.textContent = message;
        status.style.display = 'block';
        setTimeout(() => status.style.display = 'none', 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => new ScorePage());