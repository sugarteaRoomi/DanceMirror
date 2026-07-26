// Init — load video library on page load
renderLibrary();

// Ping the server every 30s. Server auto-quits after 5min with no pings.
setInterval(function() {
    fetch('/api/ping').catch(function(){});
}, 30000);
