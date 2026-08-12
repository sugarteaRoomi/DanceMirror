// ============================================================
// Create Mix — combine dance cover video with external audio
// Overlay audio plays via Web Audio BufferSource (sample-accurate)
// Video volume via video.volume. No MediaElementSource needed.
// ============================================================
var createMixBtn = document.getElementById('createMixBtn');
var mixPanel = document.getElementById('mixPanel');
var mixCloseBtn = document.getElementById('mixCloseBtn');
var mixVideoLabel = document.getElementById('mixVideoLabel');
var mixAudioLabel = document.getElementById('mixAudioLabel');
var mixVideoLibraryBtn = document.getElementById('mixVideoLibraryBtn');
var mixVideoUploadBtn = document.getElementById('mixVideoUploadBtn');
var mixAudioLibraryBtn = document.getElementById('mixAudioLibraryBtn');
var mixAudioUploadBtn = document.getElementById('mixAudioUploadBtn');
var mixVideoFile = document.getElementById('mixVideoFile');
var mixAudioFile = document.getElementById('mixAudioFile');
var mixControls = document.getElementById('mixControls');
var mixVideoVol = document.getElementById('mixVideoVol');
var mixAudioVol = document.getElementById('mixAudioVol');
var mixVideoVolVal = document.getElementById('mixVideoVolVal');
var mixAudioVolVal = document.getElementById('mixAudioVolVal');
var mixOffsetSlider = document.getElementById('mixOffsetSlider');
var mixOffsetVal = document.getElementById('mixOffsetVal');
var mixAutoSyncBtn = document.getElementById('mixAutoSyncBtn');
var mixSyncStatus = document.getElementById('mixSyncStatus');
var mixExportBtn = document.getElementById('mixExportBtn');
var mixExportProgress = document.getElementById('mixExportProgress');

var mixVideoName = null;
var mixAudioName = null;
var mixAudioBuffer = null;
var mixOffset = 0;
var mixVideoVolume = 1;
var mixAudioVolume = 1;
var _picking = null;

var _mixCtx = null;
var _mixGain = null;
var _mixSource = null;
var _mixStarting = false;

// --- Open/Close ---
createMixBtn.addEventListener('click', function() {
    mixPanel.style.display = 'block';
    createMixBtn.style.display = 'none';
});
mixCloseBtn.addEventListener('click', closeMixPanel);

function closeMixPanel() {
    getActiveVideo().pause();
    stopMixSource();
    if (_mixCtx) { _mixCtx.close(); _mixCtx = null; _mixGain = null; }
    getActiveVideo().volume = 1;
    mixPanel.style.display = 'none';
    createMixBtn.style.display = '';
    mixVideoName = null;
    mixAudioName = null;
    mixAudioBuffer = null;
    mixOffset = 0;
    mixVideoVolume = 1;
    mixAudioVolume = 1;
    mixVideoVol.value = 1; mixVideoVolVal.textContent = '100%';
    mixAudioVol.value = 1; mixAudioVolVal.textContent = '100%';
    mixOffsetSlider.value = 0; mixOffsetVal.textContent = '0.00s';
    mixVideoLabel.textContent = 'None selected';
    mixAudioLabel.textContent = 'None selected';
    mixControls.style.display = 'none';
    mixSyncStatus.textContent = '';
    _picking = null;
}

// --- Picking state ---
function startPicking(type) {
    if (_picking === type) { stopPicking(); return; }
    _picking = type;
    if (type === 'video') { mixVideoLibraryBtn.textContent = 'Click a video in the library...'; mixVideoLibraryBtn.style.color = 'var(--accent)'; }
    else { mixAudioLibraryBtn.textContent = 'Click a video in the library...'; mixAudioLibraryBtn.style.color = 'var(--accent)'; }
}
function stopPicking() {
    _picking = null;
    mixVideoLibraryBtn.textContent = 'Pick from Library'; mixVideoLibraryBtn.style.color = '';
    mixAudioLibraryBtn.textContent = 'Pick from Library'; mixAudioLibraryBtn.style.color = '';
}

mixVideoLibraryBtn.addEventListener('click', function() { startPicking('video'); });
mixAudioLibraryBtn.addEventListener('click', function() { startPicking('audio'); });

videoList.addEventListener('click', function(e) {
    if (mixPanel.style.display !== 'block') return;
    var li = e.target.closest('li');
    if (!li) return;
    var name = li.getAttribute('data-name');
    if (!name) return;
    e.stopPropagation();
    e.preventDefault();

    if (_picking === 'video') {
        setMixVideo(name);
        stopPicking();
    } else if (_picking === 'audio') {
        loadMixAudioFromLibrary(name);
        stopPicking();
    }
}, true);

// --- Video source ---
function setMixVideo(name) {
    mixVideoName = name;
    mixVideoLabel.textContent = name;
    loadVideoFromLibrary(name);
    tryShowMixControls();
}

mixVideoUploadBtn.addEventListener('click', function() { mixVideoFile.click(); });
mixVideoFile.addEventListener('change', async function() {
    var f = mixVideoFile.files[0];
    if (!f) return;
    mixVideoFile.value = '';
    mixVideoLabel.textContent = 'Uploading...';
    var form = new FormData();
    form.append('file', f);
    var resp = await fetch('/api/upload', { method: 'POST', body: form });
    var data = await resp.json();
    if (data.error) { mixVideoLabel.textContent = 'Upload failed'; return; }
    mixVideoName = data.filename;
    mixVideoLabel.textContent = data.filename;
    loadVideoFromLibrary(data.filename);
    renderLibrary();
    tryShowMixControls();
});

// --- Audio source ---
mixAudioUploadBtn.addEventListener('click', function() { mixAudioFile.click(); });
mixAudioFile.addEventListener('change', async function() {
    var f = mixAudioFile.files[0];
    if (!f) return;
    mixAudioFile.value = '';
    mixAudioLabel.textContent = 'Loading...';
    var form = new FormData();
    form.append('file', f);
    var resp = await fetch('/api/upload', { method: 'POST', body: form });
    var data = await resp.json();
    if (data.error) { mixAudioLabel.textContent = 'Upload failed'; return; }
    mixAudioName = data.filename;
    try {
        var buf = await f.arrayBuffer();
        _mixCtx = _mixCtx || new (window.AudioContext || window.webkitAudioContext)();
        mixAudioBuffer = await _mixCtx.decodeAudioData(buf);
        mixAudioLabel.textContent = data.filename;
        tryShowMixControls();
    } catch(e) {
        mixAudioLabel.textContent = 'Could not decode audio';
    }
});

async function loadMixAudioFromLibrary(name) {
    mixAudioLabel.textContent = 'Loading audio...';
    try {
        var resp = await fetch('/api/video/' + encodeURIComponent(name));
        var buf = await resp.arrayBuffer();
        _mixCtx = _mixCtx || new (window.AudioContext || window.webkitAudioContext)();
        mixAudioBuffer = await _mixCtx.decodeAudioData(buf);
        mixAudioName = name;
        mixAudioLabel.textContent = name;
        tryShowMixControls();
    } catch(e) {
        mixAudioLabel.textContent = 'Could not decode audio';
    }
}

function tryShowMixControls() {
    if (mixVideoName && mixAudioBuffer) {
        var v = getActiveVideo();
        if (!v.duration || isNaN(v.duration)) {
            v.addEventListener('loadedmetadata', function() {
                mixControls.style.display = 'block';
                updateMixOffsetRange();
            }, { once: true });
        } else {
            mixControls.style.display = 'block';
            updateMixOffsetRange();
        }
    }
}

function updateMixOffsetRange() {
    var durV = getActiveVideo().duration || 0;
    var durA = mixAudioBuffer ? mixAudioBuffer.duration : 0;
    mixOffsetSlider.min = -Math.round(durA);
    mixOffsetSlider.max = Math.round(durV);
    mixOffsetSlider.value = mixOffset;
    mixOffsetVal.textContent = mixOffset.toFixed(2) + 's';
}

// --- Volume & offset ---
mixVideoVol.addEventListener('input', function() {
    mixVideoVolume = parseFloat(this.value);
    mixVideoVolVal.textContent = Math.round(mixVideoVolume * 100) + '%';
    getActiveVideo().volume = mixVideoVolume;
});
mixAudioVol.addEventListener('input', function() {
    mixAudioVolume = parseFloat(this.value);
    mixAudioVolVal.textContent = Math.round(mixAudioVolume * 100) + '%';
    if (_mixGain) _mixGain.gain.value = mixAudioVolume;
});
mixOffsetSlider.addEventListener('input', function() {
    mixOffset = parseFloat(this.value);
    mixOffsetVal.textContent = mixOffset.toFixed(2) + 's';
});

function nudgeMixOffset(amount) {
    mixOffset = Math.round((mixOffset + amount) * 100) / 100;
    mixOffset = Math.max(parseFloat(mixOffsetSlider.min), Math.min(parseFloat(mixOffsetSlider.max), mixOffset));
    mixOffsetSlider.value = mixOffset;
    mixOffsetVal.textContent = mixOffset.toFixed(2) + 's';
}
document.getElementById('mixOffsetLeftBtn').addEventListener('click', function() { nudgeMixOffset(-1); });
document.getElementById('mixOffsetRightBtn').addEventListener('click', function() { nudgeMixOffset(1); });
document.getElementById('mixOffsetFineLeftBtn').addEventListener('click', function() { nudgeMixOffset(-1/30); });
document.getElementById('mixOffsetFineRightBtn').addEventListener('click', function() { nudgeMixOffset(1/30); });

// --- Web Audio overlay ---
function stopMixSource() {
    if (_mixSource) { try { _mixSource.stop(); } catch(e) {}; _mixSource = null; }
}

async function syncMixPlayPause() {
    if (!mixVideoName || !mixAudioBuffer) return;
    var v = getActiveVideo();
    if (v.paused) {
        await startMixPlayback(v);
    } else {
        v.pause();
        stopMixSource();
    }
}

async function startMixPlayback(v) {
    if (!mixAudioBuffer) return;
    _mixCtx = _mixCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (!_mixGain) { _mixGain = _mixCtx.createGain(); _mixGain.connect(_mixCtx.destination); }
    _mixGain.gain.value = mixAudioVolume;
    stopMixSource();
    // Resume context FIRST, while video stays paused, so no timing skew
    if (_mixCtx.state === 'suspended') await _mixCtx.resume();
    if (_mixCtx.state !== 'running') return;

    v.volume = mixVideoVolume;
    var target = v.currentTime + mixOffset;
    if (target < 0) target = 0;
    if (target >= mixAudioBuffer.duration) { v.play(); return; }

    var when = _mixCtx.currentTime + 0.05;
    var startOffset = target;
    _mixSource = _mixCtx.createBufferSource();
    _mixSource.buffer = mixAudioBuffer;
    _mixSource.connect(_mixGain);
    _mixSource.start(when, startOffset);
    // Start video at the same moment; both then run at 1x real-time
    _mixStarting = true;
    v.play();
    setTimeout(function() { _mixStarting = false; }, 100);

    // One-time correction: snap audio to video after startup latency
    setTimeout(function() {
        if (v.paused || !_mixSource || !_mixCtx) return;
        var expected = startOffset + (_mixCtx.currentTime - when);
        var desired = v.currentTime + mixOffset;
        if (desired < 0) desired = 0;
        if (desired > mixAudioBuffer.duration) return;
        if (Math.abs(expected - desired) > 0.04) {
            stopMixSource();
            var src = _mixCtx.createBufferSource();
            src.buffer = mixAudioBuffer;
            src.connect(_mixGain);
            src.start(_mixCtx.currentTime, desired);
            _mixSource = src;
        }
    }, 400);
}

// Event hooks (video click / keyboard start the video directly)
videoPlayer.addEventListener('play', function() {
    if (mixControls.style.display === 'block' && mixAudioBuffer && !_mixStarting) {
        startMixPlayback(getActiveVideo());
    }
});
videoPlayer.addEventListener('pause', function() {
    if (mixControls.style.display === 'block') stopMixSource();
});
videoPlayer.addEventListener('seeked', function() {
    if (mixControls.style.display === 'block' && mixAudioBuffer && !getActiveVideo().paused) {
        startMixPlayback(getActiveVideo());
    }
});
cutVideo.addEventListener('play', function() {
    if (mixControls.style.display === 'block' && mixAudioBuffer && !_mixStarting) {
        startMixPlayback(getActiveVideo());
    }
});
cutVideo.addEventListener('pause', function() {
    if (mixControls.style.display === 'block') stopMixSource();
});

videoPlayer.addEventListener('ended', function() {
    if (mixControls.style.display !== 'block' || !isLooping) return;
    var v = getActiveVideo();
    stopMixSource();
    v.currentTime = 0;
    v.play();
});

// --- Auto-sync (same algorithm as Compare mode) ---
mixAutoSyncBtn.addEventListener('click', async function() {
    if (!mixAudioBuffer || !mixVideoName) return;
    var v = getActiveVideo();
    if (!v.duration || isNaN(v.duration)) { mixSyncStatus.textContent = 'Wait for video to load first.'; return; }
    v.pause();
    stopMixSource();
    mixSyncStatus.textContent = 'Analyzing...';
    mixAutoSyncBtn.disabled = true;

    try {
        var durV = v.duration;
        var vidSrc = '/api/video/' + encodeURIComponent(mixVideoName);
        var roughV = await extractWaveform(vidSrc, durV, 200, 5);
        if (!roughV) throw new Error('Could not read video audio');

        var roughA = extractWaveformFromBuffer(mixAudioBuffer, 200, 5);
        var onsetV = trimLeadingSilence(roughV);
        var onsetA = trimLeadingSilence(roughA);

        mixSyncStatus.textContent = 'Finding alignment...';
        var roughOffset = crossCorrelate(roughV, roughA);
        if (roughOffset === null) throw new Error('No match found');

        mixSyncStatus.textContent = 'Fine-tuning...';
        var fineV = await extractWaveform(vidSrc, durV, 1000, 2);
        var fineA = extractWaveformFromBuffer(mixAudioBuffer, 1000, 2);
        trimLeadingSilenceAt(fineV, onsetV);
        trimLeadingSilenceAt(fineA, onsetA);
        var onsetCorrection = onsetA - onsetV;
        mixOffset = Math.round((fineTune(fineV, fineA, roughOffset) + onsetCorrection) * 100) / 100;

        mixOffsetSlider.value = mixOffset;
        mixOffsetVal.textContent = mixOffset.toFixed(2) + 's';
        mixSyncStatus.textContent = 'Synced! Offset: ' + mixOffset.toFixed(2) + 's';

        // Seek to start and play
        v.currentTime = 0;
        var _played = false;
        function _seekAndPlay() { if (_played) return; _played = true; syncMixPlayPause(); }
        v.addEventListener('seeked', _seekAndPlay, { once: true });
        setTimeout(_seekAndPlay, 300);
    } catch(e) {
        mixSyncStatus.textContent = 'Sync failed: ' + (e.message || 'unknown');
    }
    mixAutoSyncBtn.disabled = false;
});

// --- Export ---
mixExportBtn.addEventListener('click', async function() {
    if (!mixVideoName || !mixAudioName) return;
    mixExportBtn.disabled = true;
    mixExportProgress.style.display = 'block';
    mixExportProgress.textContent = 'Exporting... this may take a minute.';

    try {
        var resp = await fetch('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                video: mixVideoName,
                audio: mixAudioName,
                offset: mixOffset,
                videoVol: mixVideoVolume,
                audioVol: mixAudioVolume
            })
        });
        var data = await resp.json();
        if (data.error) {
            mixExportProgress.textContent = 'Export failed: ' + data.error;
        } else {
            mixExportProgress.textContent = 'Exported: ' + data.filename;
            var a = document.createElement('a');
            a.href = '/api/export/' + encodeURIComponent(data.filename);
            a.download = data.filename;
            a.click();
            renderLibrary();
        }
    } catch(e) {
        mixExportProgress.textContent = 'Export failed: ' + e.message;
    }
    mixExportBtn.disabled = false;
});
