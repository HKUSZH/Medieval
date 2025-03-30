// Visitor tracking
(function() {
    // Get device type
    const deviceType = /Mobile|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) 
        ? 'Mobile' 
        : 'Desktop';
    const userAgent =navigator.userAgent

    // Get IP and timestamp
    fetch('/get-ip')
        .then(response => response.json())
        .then(data => {
            const visitorData = {
                ip: data.ip,
                device: userAgent,
                timestamp: new Date().toISOString(),
                page: window.location.pathname
            };

            // Send data to server
            fetch('/log-visitor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(visitorData)
            });
        })
        .catch(error => console.error('Error tracking visitor:', error));
})();