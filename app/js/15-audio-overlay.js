// ============================================================
// Create Mix — combine dance cover video with external audio
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
var mixVideoBlob = null;
var mixAudioBuffer = null;
var mixAudioName = null;
var mixOffset = 0;
var mixVideoVolume = 1;
var mixAudioVolume = 1;
var _mixCtx = null;
var _mixSourceNode = null;
var _mixGain = null;

// --- Open/Close ---
createMixBtn.addEventListener('click', function() {
    mixPanel.style.display = 'block';
    createMixBtn.style.display = 'none';
});
mixCloseBtn.addEventListener('click', closeMixPanel);

function closeMixPanel() {
    stopMixSource();
    if (getActiveVideo()) getActiveVideo().volume = 1;
    mixPanel.style.display = 'none';
    createMixBtn.style.display = '';
    mixVideoName = null;
    mixVideoBlob = null;
    mixAudioBuffer = null;
    mixAudioName = null;
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

// --- Picking state: null, 'video', or 'audio' ---
var _picking = null;
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

// Intercept all library clicks when mix panel is open
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
    // If not picking, block the click so video doesn't change
}, true);

function setMixVideo(name) {
    mixVideoName = name;
    mixVideoBlob = null;
    mixVideoLabel.textContent = name;
    loadVideoFromLibrary(name);
    tryShowMixControls();
}

function tryShowMixControls() {
    if (mixVideoName && mixAudioBuffer) {
        var v = getActiveVideo();
        if (!v.duration || isNaN(v.duration)) {
            v.addEventListener('loadedmetadata', function() {
                mixControls.style.display = 'block';
                updateMixOffsetRange();
                ensureMixCtx();
            }, { once: true });
        } else {
            mixControls.style.display = 'block';
            updateMixOffsetRange();
            ensureMixCtx();
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

// --- Upload buttons ---
mixVideoUploadBtn.addEventListener('click', function() { mixVideoFile.click(); });
mixAudioUploadBtn.addEventListener('click', function() { mixAudioFile.click(); });

mixVideoFile.addEventListener('change', async function() {
    var f = mixVideoFile.files[0];
    if (!f) return;
    mixVideoFile.value = '';
    // Upload the file to the server
    var form = new FormData();
    form.append('file', f);
    mixVideoLabel.textContent = 'Uploading...';
    var resp = await fetch('/api/upload', { method: 'POST', body: form });
    var data = await resp.json();
    mixVideoName = data.filename;
    mixVideoBlob = null;
    mixVideoLabel.textContent = data.filename;
    loadVideoFromLibrary(data.filename);
    renderLibrary();
    tryShowMixControls();
});

mixAudioFile.addEventListener('change', async function() {
    var f = mixAudioFile.files[0];
    if (!f) return;
    mixAudioFile.value = '';
    mixAudioLabel.textContent = 'Loading...';
    _mixCtx = _mixCtx || new (window.AudioContext || window.webkitAudioContext)();
    var buf = await f.arrayBuffer();
    mixAudioBuffer = await _mixCtx.decodeAudioData(buf);
    mixAudioName = f.name;
    mixAudioLabel.textContent = f.name;
    tryShowMixControls();
});

async function loadMixAudioFromLibrary(name) {
    mixAudioLabel.textContent = 'Extracting audio...';
    _mixCtx = _mixCtx || new (window.AudioContext || window.webkitAudioContext)();
    var resp = await fetch('/api/video/' + encodeURIComponent(name));
    var buf = await resp.arrayBuffer();
    mixAudioBuffer = await _mixCtx.decodeAudioData(buf);
    mixAudioName = name;
    mixAudioLabel.textContent = name;
    tryShowMixControls();
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

// --- Web Audio ---
function ensureMixCtx() {
    _mixCtx = _mixCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (!_mixGain) {
        _mixGain = _mixCtx.createGain();
        _mixGain.connect(_mixCtx.destination);
    }
    _mixGain.gain.value = mixAudioVolume;
}

function stopMixSource() {
    if (_mixSourceNode) { try { _mixSourceNode.stop(); } catch(e) {}; _mixSourceNode = null; }
}

function startMixAudio() {
    if (!mixAudioBuffer) return;
    ensureMixCtx();
    stopMixSource();
    if (_mixCtx.state === 'suspended') _mixCtx.resume();

    var v = getActiveVideo();
    v.volume = mixVideoVolume;
    var audioStart = v.currentTime + mixOffset;
    _mixSourceNode = _mixCtx.createBufferSource();
    _mixSourceNode.buffer = mixAudioBuffer;
    _mixSourceNode.connect(_mixGain);

    var t = _mixCtx.currentTime + 0.01;
    if (audioStart <= 0) {
        _mixSourceNode.start(t, Math.max(0, -audioStart));
    } else if (audioStart < mixAudioBuffer.duration) {
        _mixSourceNode.start(t, audioStart);
    }
}

// Hook into player events while mix controls are visible
videoPlayer.addEventListener('play', function() {
    if (mixControls.style.display === 'block') startMixAudio();
});
videoPlayer.addEventListener('pause', function() {
    if (mixControls.style.display === 'block') stopMixSource();
});
videoPlayer.addEventListener('seeked', function() {
    if (mixControls.style.display === 'block' && !getActiveVideo().paused) startMixAudio();
});

// --- Auto-sync ---
mixAutoSyncBtn.addEventListener('click', async function() {
    if (!mixAudioBuffer || !mixVideoName) return;
    var v = getActiveVideo();
    if (!v.duration || isNaN(v.duration)) {
        mixSyncStatus.textContent = 'Wait for video to load first.';
        return;
    }
    v.pause();
    stopMixSource();
    mixSyncStatus.textContent = 'Analyzing...';
    mixAutoSyncBtn.disabled = true;

    try {
        var durV = v.duration;
        var vidSrc = mixVideoBlob || '/api/video/' + encodeURIComponent(mixVideoName);
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
        function _seekAndPlay() { if (_played) return; _played = true; v.play(); }
        v.addEventListener('seeked', _seekAndPlay, { once: true });
        setTimeout(_seekAndPlay, 300);
    } catch(e) {
        mixSyncStatus.textContent = 'Sync failed: ' + (e.message || 'unknown');
    }
    mixAutoSyncBtn.disabled = false;
});

function extractWaveformFromBuffer(audioBuffer, targetRate, envelopeMs) {
    var raw = audioBuffer.getChannelData(0);
    var origRate = audioBuffer.sampleRate;
    var windowLen = Math.floor(origRate * envelopeMs / 1000);
    var hopLen = Math.floor(origRate / targetRate);
    var len = Math.floor(raw.length / hopLen);
    var samples = new Float32Array(len);
    for (var i = 0; i < len; i++) {
        var center = i * hopLen;
        var start = Math.max(0, center - Math.floor(windowLen / 2));
        var end = Math.min(raw.length, start + windowLen);
        var sumSq = 0;
        for (var j = start; j < end; j++) sumSq += raw[j] * raw[j];
        samples[i] = Math.sqrt(sumSq / (end - start));
    }
    var sum = 0;
    for (var i = 0; i < samples.length; i++) sum += samples[i];
    var mean = sum / samples.length;
    for (var i = 0; i < samples.length; i++) samples[i] -= mean;
    var maxAbs = 0;
    for (var i = 0; i < samples.length; i++) { if (Math.abs(samples[i]) > maxAbs) maxAbs = samples[i]; }
    if (maxAbs > 0) for (var i = 0; i < samples.length; i++) samples[i] /= maxAbs;
    return { data: samples, sampleRate: targetRate };
}

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

// Clean up on player change
videoPlayer.addEventListener('loadedmetadata', function() {
    // If mix panel is closed, nothing to do
});
