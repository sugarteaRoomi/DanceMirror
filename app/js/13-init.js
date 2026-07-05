// Init — load video library on page load
renderLibrary();

// Camera button
var cameraBtn = document.getElementById('cameraBtn');
if (cameraBtn) cameraBtn.addEventListener('click', function() { window.open('camera.html', '_blank'); });

// Quit button
var quitBtn = document.getElementById('quitBtn');
if (quitBtn) quitBtn.addEventListener('click', function() { fetch('/api/quit', { method: 'POST' }); window.close(); });
