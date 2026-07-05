// Video Library — loads from local /api/videos
async function renderLibrary() {
    try {
        var resp = await fetch('/api/videos');
        var files = await resp.json();
    } catch(e) {
        videoList.innerHTML = '<div class="empty-state"><p>Could not load videos. Make sure the server is running.</p></div>';
        return;
    }

    if (!files.length) {
        videoList.innerHTML = '<div class="empty-state"><p>No videos yet. Upload from your computer or paste a YouTube link above.</p></div>';
        compareBtn.style.display = 'none';
        return;
    }

    videoList.innerHTML = '';
    files.forEach(function(f) {
        var li = document.createElement('li');
        li.setAttribute('data-name', f.name);
        var label = '';
        if (isCompareMode) {
            if (currentVideo && currentVideo.name === f.name) label = ' <span style="color:var(--accent);font-weight:600;font-size:0.75rem;">A</span>';
            if (currentVideoB === f.name) label += ' <span style="color:var(--accent2);font-weight:600;font-size:0.75rem;">B</span>';
        }
        if (isCompareMode && compareTarget === 'B') {
            if (currentVideoB === f.name) li.classList.add('active');
        } else {
            if (currentVideo && currentVideo.name === f.name) li.classList.add('active');
        }
        li.innerHTML =
            '<span class="vname">' + escapeHTML(f.name) + label + '</span>' +
            '<span class="vmeta">' + formatFileSize(f.size) + '</span>' +
            '<button class="vid-delete" data-name="' + escapeHTML(f.name) + '" title="Delete video">&#x2715;</button>';
        videoList.appendChild(li);
        li.querySelector('.vid-delete').addEventListener('click', function(e) {
            e.stopPropagation();
            var delName = this.getAttribute('data-name');
            if (confirm('Delete "' + delName + '" permanently?')) {
                fetch('/api/video/' + encodeURIComponent(delName), { method: 'DELETE' }).then(function() {
                    renderLibrary();
                });
            }
        });
    });
    compareBtn.style.display = '';
}

function loadVideoFromLibrary(filename) {
    var url = '/api/video/' + encodeURIComponent(filename);
    fetch('/api/videos').then(function(r) { return r.json(); }).then(function(files) {
        var found = files.find(function(f) { return f.name === filename; });
        var size = found ? found.size : 0;
        playVideo(url, filename, size);
        currentVideo = { name: filename, size: size };
        currentVideoBlob = null;
        // Load markers/loop/cut from localStorage
        loadVideoState(filename);
    });
}

function loadVideoState(filename) {
    try {
        var saved = JSON.parse(localStorage.getItem('mirror-markers-' + filename));
        markers = (saved && typeof saved === 'object' && !Array.isArray(saved)) ? saved : {};
    } catch(e) { markers = {}; }
    try {
        var loopSaved = JSON.parse(localStorage.getItem('mirror-loop-' + filename));
        if (loopSaved && typeof loopSaved === 'object') {
            loopStartTime = loopSaved.start; loopEndTime = loopSaved.end;
        } else { loopStartTime = null; loopEndTime = null; }
    } catch(e) { loopStartTime = null; loopEndTime = null; }
    try {
        var cutSaved = JSON.parse(localStorage.getItem('mirror-cut-' + filename));
        if (cutSaved && typeof cutSaved === 'object') {
            cutStartTime = cutSaved.start; cutEndTime = cutSaved.end;
        } else { cutStartTime = null; cutEndTime = null; }
    } catch(e) { cutStartTime = null; cutEndTime = null; }
    isLoopPlaying = false;
    isCutActive = false;
    updateLoopDisplay();
    updateLoopPlayBtn();
    updateCutDisplay();
    updateCutPlayBtn();
}

// Click handler for video list
videoList.addEventListener('click', async function(e) {
    var li = e.target.closest('li');
    if (!li) return;
    var name = li.getAttribute('data-name');
    if (name) {
        if (isCompareMode && compareTarget === 'B') {
            loadVideoBFromLibrary(name);
        } else {
            loadVideoFromLibrary(name);
            if (isCompareMode) {
                compareTarget = 'B';
                if (typeof updateTargetButtons === 'function') updateTargetButtons();
                renderLibrary();
            }
        }
    }
});

// Add Video button — opens file picker, uploads to videos/
var addVideoBtn = document.getElementById('addVideoBtn');
var videoFileInput = document.getElementById('videoFileInput');
addVideoBtn.addEventListener('click', function() { videoFileInput.click(); });
videoFileInput.addEventListener('change', async function() {
    var files = videoFileInput.files;
    if (!files.length) return;
    for (var i = 0; i < files.length; i++) {
        var form = new FormData();
        form.append('file', files[i]);
        await fetch('/api/upload', { method: 'POST', body: form });
    }
    videoFileInput.value = '';
    renderLibrary();
});

// ============================================================
// Play Video
// ============================================================
function playVideo(src, name, size) {
    isOnCutVideo = false;
    cutPrepped = false;
    cutVideo.style.display = 'none';
    cutVideo.pause();
    videoPlayer.style.opacity = '1';
    videoPlayer.style.pointerEvents = '';

    videoPlayer.src = src;
    cutVideo.src = src;
    playerLayout.classList.add('active');
    playerTitle.textContent = name;
    videoInfo.innerHTML = '';

    if (isMirrored) {
        videoWrap.classList.add('mirrored');
    } else {
        videoWrap.classList.remove('mirrored');
    }

    videoPlayer.load();
    cutVideo.load();
    renderKeybinds();
}

function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    var mb = bytes / 1048576;
    return mb >= 1 ? mb.toFixed(1) + ' MB' : (bytes / 1024).toFixed(0) + ' KB';
}

function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
