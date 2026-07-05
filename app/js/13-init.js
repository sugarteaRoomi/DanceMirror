// Init — load video library on page load
renderLibrary();

// Camera button
var cameraBtn = document.getElementById('cameraBtn');
if (cameraBtn) cameraBtn.addEventListener('click', function() { window.open('camera.html', '_blank'); });

// Ping the server every 30s. Server auto-quits after 5min with no pings.
setInterval(function() {
    fetch('/api/ping').catch(function(){});
}, 30000);
