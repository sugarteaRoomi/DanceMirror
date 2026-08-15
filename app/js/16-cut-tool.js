// ============================================================
// Cut Video — remove a chunk from a single video and export
// ============================================================
var cutBtn = document.getElementById('cutBtn');
var cutPanel = document.getElementById('cutPanel');
var cutCloseBtn = document.getElementById('cutCloseBtn');
var cutVideoLabel = document.getElementById('cutVideoLabel');
var cutVideoLibraryBtn = document.getElementById('cutVideoLibraryBtn');
var cutVideoUploadBtn = document.getElementById('cutVideoUploadBtn');
var cutVideoFile = document.getElementById('cutVideoFile');
var cutControls = document.getElementById('cutControls');
var cutSetStartBtn = document.getElementById('cutSetStartBtn');
var cutSetEndBtn = document.getElementById('cutSetEndBtn');
var cutStartLeft = document.getElementById('cutStartLeft');
var cutStartFineLeft = document.getElementById('cutStartFineLeft');
var cutStartFineRight = document.getElementById('cutStartFineRight');
var cutStartRight = document.getElementById('cutStartRight');
var cutEndLeft = document.getElementById('cutEndLeft');
var cutEndFineLeft = document.getElementById('cutEndFineLeft');
var cutEndFineRight = document.getElementById('cutEndFineRight');
var cutEndRight = document.getElementById('cutEndRight');
var cutStartDisplay = document.getElementById('cutStartDisplay');
var cutEndDisplay = document.getElementById('cutEndDisplay');
var cutExportBtn = document.getElementById('cutExportBtn');
var cutExportProgress = document.getElementById('cutExportProgress');

var cutVideoName = null;
var cutStart = null;
var cutEnd = null;
var _cutPicking = null;

// --- Open/Close ---
cutBtn.addEventListener('click', function() {
    // Close the other tools so they don't conflict
    if (typeof isCompareMode !== 'undefined' && isCompareMode) compareBtn.click();
    if (typeof closeMixPanel === 'function') closeMixPanel();
    if (typeof compareBtn !== 'undefined') compareBtn.disabled = true;
    if (typeof createMixBtn !== 'undefined') createMixBtn.disabled = true;
    cutPanel.style.display = 'block';
    cutBtn.style.display = 'none';
});
cutCloseBtn.addEventListener('click', closeCutPanel);

function closeCutPanel() {
    if (typeof compareBtn !== 'undefined') compareBtn.disabled = false;
    if (typeof createMixBtn !== 'undefined') createMixBtn.disabled = false;
    cutPanel.style.display = 'none';
    cutBtn.style.display = '';
    cutVideoName = null;
    cutStart = null;
    cutEnd = null;
    cutVideoLabel.textContent = 'None selected';
    cutStartDisplay.textContent = 'Start: —';
    cutEndDisplay.textContent = 'End: —';
    cutControls.style.display = 'none';
    _cutPicking = null;
}

// --- Video picking ---
function startCutPicking() {
    if (_cutPicking === 'video') { stopCutPicking(); return; }
    _cutPicking = 'video';
    cutVideoLibraryBtn.textContent = 'Click a video in the library...';
    cutVideoLibraryBtn.style.color = 'var(--accent)';
}
function stopCutPicking() {
    _cutPicking = null;
    cutVideoLibraryBtn.textContent = 'Pick from Library';
    cutVideoLibraryBtn.style.color = '';
}
cutVideoLibraryBtn.addEventListener('click', startCutPicking);

videoList.addEventListener('click', function(e) {
    if (cutPanel.style.display !== 'block') return;
    var li = e.target.closest('li');
    if (!li) return;
    var name = li.getAttribute('data-name');
    if (!name) return;
    e.stopPropagation();
    e.preventDefault();
    if (_cutPicking === 'video') {
        setCutVideo(name);
        stopCutPicking();
    }
}, true);

function setCutVideo(name) {
    cutVideoName = name;
    cutVideoLabel.textContent = name;
    loadVideoFromLibrary(name);
    cutControls.style.display = 'block';
    cutStart = null;
    cutEnd = null;
    updateCutDisplay();
}

cutVideoUploadBtn.addEventListener('click', function() { cutVideoFile.click(); });
cutVideoFile.addEventListener('change', async function() {
    var f = cutVideoFile.files[0];
    if (!f) return;
    cutVideoFile.value = '';
    cutVideoLabel.textContent = 'Uploading...';
    var form = new FormData();
    form.append('file', f);
    var resp = await fetch('/api/upload', { method: 'POST', body: form });
    var data = await resp.json();
    if (data.error) { cutVideoLabel.textContent = 'Upload failed'; return; }
    setCutVideo(data.filename);
    renderLibrary();
});

// --- Set cut points ---
cutSetStartBtn.addEventListener('click', function() {
    cutStart = getActiveVideo().currentTime;
    if (cutEnd !== null && cutEnd <= cutStart) cutEnd = null;
    updateCutDisplay();
});
cutSetEndBtn.addEventListener('click', function() {
    cutEnd = getActiveVideo().currentTime;
    if (cutStart !== null && cutStart >= cutEnd) cutStart = null;
    updateCutDisplay();
});

var CUT_COARSE = 1;
var CUT_FINE = 1 / 30;
function nudgeCutStart(dir, step) {
    if (cutStart === null) return;
    var dur = videoPlayer.duration || 0;
    cutStart = Math.max(0, Math.min(dur, cutStart + dir * step));
    if (cutEnd !== null && cutEnd <= cutStart) cutEnd = null;
    updateCutDisplay();
}
function nudgeCutEnd(dir, step) {
    if (cutEnd === null) return;
    var dur = videoPlayer.duration || 0;
    cutEnd = Math.max(0, Math.min(dur, cutEnd + dir * step));
    if (cutStart !== null && cutStart >= cutEnd) cutStart = null;
    updateCutDisplay();
}
cutStartLeft.addEventListener('click', function() { nudgeCutStart(-CUT_COARSE); });
cutStartFineLeft.addEventListener('click', function() { nudgeCutStart(-CUT_FINE); });
cutStartFineRight.addEventListener('click', function() { nudgeCutStart(CUT_FINE); });
cutStartRight.addEventListener('click', function() { nudgeCutStart(CUT_COARSE); });
cutEndLeft.addEventListener('click', function() { nudgeCutEnd(-CUT_COARSE); });
cutEndFineLeft.addEventListener('click', function() { nudgeCutEnd(-CUT_FINE); });
cutEndFineRight.addEventListener('click', function() { nudgeCutEnd(CUT_FINE); });
cutEndRight.addEventListener('click', function() { nudgeCutEnd(CUT_COARSE); });

function updateCutDisplay() {
    cutStartDisplay.textContent = 'Start: ' + (cutStart !== null ? formatTimePrecise(cutStart) : '—');
    cutEndDisplay.textContent = 'End: ' + (cutEnd !== null ? formatTimePrecise(cutEnd) : '—');
}

// --- Preview: skip the cut region during playback ---
videoPlayer.addEventListener('timeupdate', function() {
    if (cutPanel.style.display !== 'block') return;
    if (cutStart === null || cutEnd === null) return;
    var t = videoPlayer.currentTime;
    if (t >= cutStart && t < cutEnd) {
        videoPlayer.currentTime = cutEnd;
    }
});

// --- Export ---
cutExportBtn.addEventListener('click', async function() {
    if (!cutVideoName || cutStart === null || cutEnd === null) {
        cutExportProgress.style.display = 'block';
        cutExportProgress.textContent = 'Select a video and set start/end first.';
        setTimeout(function() { cutExportProgress.style.display = 'none'; }, 3000);
        return;
    }
    cutExportBtn.disabled = true;
    cutExportProgress.style.display = 'block';
    cutExportProgress.textContent = 'Exporting... this may take a minute.';

    try {
        var resp = await fetch('/api/cut', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video: cutVideoName, start: cutStart, end: cutEnd })
        });
        var data = await resp.json();
        if (data.error) {
            cutExportProgress.textContent = 'Export failed: ' + data.error;
        } else {
            cutExportProgress.textContent = 'Exported: ' + data.filename;
            var a = document.createElement('a');
            a.href = '/api/cut/' + encodeURIComponent(data.filename);
            a.download = data.filename;
            a.click();
            renderLibrary();
        }
    } catch(e) {
        cutExportProgress.textContent = 'Export failed: ' + e.message;
    }
    cutExportBtn.disabled = false;
});
