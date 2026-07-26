// YouTube Downloader
var youtubeBtn = document.getElementById('youtubeBtn');
var youtubeUrl = document.getElementById('youtubeUrl');
var youtubeProgress = document.getElementById('youtubeProgress');
var _pollTimer = null;

youtubeBtn.addEventListener('click', async function() {
    var url = youtubeUrl.value.trim();
    if (!url) return;
    youtubeBtn.disabled = true;
    youtubeProgress.style.display = 'block';
    youtubeProgress.textContent = 'Starting download...';

    try {
        var resp = await fetch('/api/youtube', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });
        var data = await resp.json();
        if (data.error) { youtubeProgress.textContent = 'Error: ' + data.error; youtubeBtn.disabled = false; return; }

        _pollTimer = setInterval(async function() {
            try {
                var pr = await fetch('/api/youtube/progress?url=' + encodeURIComponent(url));
                var pd = await pr.json();
                if (pd.status === 'downloading') {
                    youtubeProgress.textContent = 'Downloading... ' + Math.round(pd.progress) + '%';
                } else if (pd.status === 'done') {
                    clearInterval(_pollTimer);
                    youtubeProgress.textContent = 'Done! ' + escapeHTML(pd.filename);
                    youtubeUrl.value = '';
                    youtubeBtn.disabled = false;
                    renderLibrary();
                } else if (pd.status === 'error') {
                    clearInterval(_pollTimer);
                    youtubeProgress.textContent = 'Error: ' + (pd.error || 'unknown');
                    youtubeBtn.disabled = false;
                }
            } catch(e) {
                clearInterval(_pollTimer);
                youtubeProgress.textContent = 'Connection lost';
                youtubeBtn.disabled = false;
            }
        }, 1000);
    } catch(e) {
        youtubeProgress.textContent = 'Error: ' + e.message;
        youtubeBtn.disabled = false;
    }
});

youtubeUrl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') youtubeBtn.click();
});
