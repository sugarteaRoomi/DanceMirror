// Init — load video library on page load
renderLibrary();

// Camera button
var cameraBtn = document.getElementById('cameraBtn');
if (cameraBtn) cameraBtn.addEventListener('click', function() { window.open('camera.html', '_blank'); });

// Shut down server when tab/window closes
window.addEventListener('beforeunload', function() {
    fetch('/api/quit', { method: 'POST', keepalive: true });
});
