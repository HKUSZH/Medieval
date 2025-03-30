document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        // Wait briefly to ensure cookie is set
        await new Promise(resolve => setTimeout(resolve, 100));

        const data = await response.json();
        console.log(data)
        if (response.ok) {
            // Redirect based on user role with email parameter
            let redirectUrl = '/reviewer'; 
            console.log(data.role)
            switch (data.role) {
                case 'admin':
                    redirectUrl = '/admin';
                    console.log("in admin");
                    // Code to execute if expression == value1
                    break;
                case 'reviewer':
                    redirectUrl = '/reviewer';
                    console.log("in reviewer");
                    // Code to execute if expression == value2
                    break;
                case 'designer':
                    redirectUrl = '/designer';
                    console.log("in designer");
                    // Code to execute if expression == value2
                    break;
                default:
                    redirectUrl = '/designer';
                    console.log("in default");
                    // Code to execute if none of the cases match
            }
            console.log("redirectUrl:["+redirectUrl+"]")
            
            // Track successful login
            fetch('/get-ip')
                .then(response => response.json())
                .then(ipData => {
                    const loginData = {
                        user: data.name,
                        email: email,
                        ip: ipData.ip,
                        timestamp: new Date().toISOString(),
                        role: data.role
                    };
                    
                    fetch('/log-visitor', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(loginData)
                    });
                });

            window.location.href = `${redirectUrl}?email=${encodeURIComponent(email)}`;
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login');
    }
});