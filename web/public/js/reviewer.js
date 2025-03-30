let currentUser = null;
let department = null;

// Load user data on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log("in reviewer.js")
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

        // Set Eval Questions link with email parameter
        const evalQuestionsLink = document.querySelector('.eval-questions');
        evalQuestionsLink.href = `/evalQuestion?email=${encodeURIComponent(user.email)}`;

        const evalAnswersLink = document.querySelector('.eval-answers');
        evalAnswersLink.href = `/evalAnswer?email=${encodeURIComponent(user.email)}`;
        
    } catch (error) {
        console.error('Error loading reviewer dashboard:', error);
        alert('Failed to load reviewer dashboard. Please try again.');
    }
});

// Logout function
function logout() {
    fetch('/logout', { method: 'POST' })
        .then(() => window.location.href = '/')
        .catch(err => console.error('Logout error:', err));
}