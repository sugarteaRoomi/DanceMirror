// ============================================================
// Audio Overlay — sync separate audio with dance cover video
// ============================================================
var overlayBtn = document.getElementById('overlayBtn');
var overlayArea = document.getElementById('overlayArea');
var overlayAudioFile = document.getElementById('overlayAudioFile');
var overlayAudioBtn = document.getElementById('overlayAudioBtn');
var overlayAudioLabel = document.getElementById('overlayAudioLabel');
var overlayVideoVol = document.getElementById('overlayVideoVol');
var overlayAudioVol = document.getElementById('overlayAudioVol');
var overlayVideoVolVal = document.getElementById('overlayVideoVolVal');
var overlayAudioVolVal = document.getElementById('overlayAudioVolVal');
var overlayOffsetSlider = document.getElementById('overlayOffsetSlider');
var overlayOffsetVal = document.getElementById('overlayOffsetVal');
var overlayAutoSyncBtn = document.getElementById('overlayAutoSyncBtn');
var overlaySyncStatus = document.getElementById('overlaySyncStatus');
var overlayExportBtn = document.getElementById('overlayExportBtn');
var overlayExportProgress = document.getElementById('overlayExportProgress');

var isOverlayMode = false;
var overlayAudioBuffer = null;
var overlayAudioFilename = '';
var overlayOffset = 0;
var overlayVideoVolume = 1;
var overlayAudioVolume = 1;
var audioCtx = null;
var _sourceNode = null;
var _vidSource = null;
var _vidGain = null;
var _audGain = null;

// --- Mode toggle ---
overlayBtn.addEventListener('click', function() {
    isOverlayMode = !isOverlayMode;
    if (isOverlayMode) {
        overlayArea.style.display = 'block';
        overlayBtn.classList.add('active');
        overlayBtn.textContent = 'Audio Overlay: On';
        if (audioCtx || currentVideo) { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); }
        hookPlayback();
    } else {
        stopSource();
        teardownAudioGraph();
        overlayArea.style.display = 'none';
        overlayBtn.classList.remove('active');
        overlayBtn.textContent = 'Audio Overlay: Off';
        unhookPlayback();
    }
});

// --- Volume & offset ---
function updateOverlaySliderRange() {
    var durV = (currentVideo && getActiveVideo().duration) ? getActiveVideo().duration : 0;
    var durA = overlayAudioBuffer ? overlayAudioBuffer.duration : 0;
    overlayOffsetSlider.min = -Math.round(durA);
    overlayOffsetSlider.max = Math.round(durV);
    overlayOffsetSlider.step = 0.01;
    overlayOffsetSlider.value = overlayOffset;
    overlayOffsetVal.textContent = overlayOffset.toFixed(2) + 's';
}

overlayVideoVol.addEventListener('input', function() {
    overlayVideoVolume = parseFloat(this.value);
    overlayVideoVolVal.textContent = Math.round(overlayVideoVolume * 100) + '%';
    if (_vidGain) _vidGain.gain.value = overlayVideoVolume;
});
overlayAudioVol.addEventListener('input', function() {
    overlayAudioVolume = parseFloat(this.value);
    overlayAudioVolVal.textContent = Math.round(overlayAudioVolume * 100) + '%';
    if (_audGain) _audGain.gain.value = overlayAudioVolume;
});
overlayOffsetSlider.addEventListener('input', function() {
    overlayOffset = parseFloat(this.value);
    overlayOffsetVal.textContent = overlayOffset.toFixed(2) + 's';
});

function nudgeOverlayOffset(dir) {
    var step = parseFloat(overlayOffsetSlider.step) || 0.01;
    overlayOffset = Math.round((overlayOffset + dir * step) * 100) / 100;
    overlayOffset = Math.max(parseFloat(overlayOffsetSlider.min), Math.min(parseFloat(overlayOffsetSlider.max), overlayOffset));
    overlayOffsetSlider.value = overlayOffset;
    overlayOffsetVal.textContent = overlayOffset.toFixed(2) + 's';
}
document.getElementById('overlayOffsetLeftBtn').addEventListener('click', function() { nudgeOverlayOffset(-1); });
document.getElementById('overlayOffsetRightBtn').addEventListener('click', function() { nudgeOverlayOffset(1); });
document.getElementById('overlayOffsetFineLeftBtn').addEventListener('click', function() { nudgeOverlayOffset(-1/30); });
document.getElementById('overlayOffsetFineRightBtn').addEventListener('click', function() { nudgeOverlayOffset(1/30); });

// --- Audio file upload ---
overlayAudioBtn.addEventListener('click', function() { overlayAudioFile.click(); });
overlayAudioFile.addEventListener('change', async function() {
    var f = overlayAudioFile.files[0];
    if (!f) return;
    overlayAudioFile.value = '';
    await loadAudioFile(f);
    overlayAudioFilename = f.name;
    overlayAudioLabel.textContent = f.name;
    updateOverlaySliderRange();
});

async function loadAudioFile(blob) {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    var buf = await blob.arrayBuffer();
    overlayAudioBuffer = await audioCtx.decodeAudioData(buf);
}

// Load audio from library (extract from video file)
async function loadAudioFromLibraryFile(filename) {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    overlaySyncStatus.textContent = 'Extracting audio...';
    var resp = await fetch('/api/video/' + encodeURIComponent(filename));
    var buf = await resp.arrayBuffer();
    overlayAudioBuffer = await audioCtx.decodeAudioData(buf);
    overlayAudioFilename = filename;
    overlayAudioLabel.textContent = filename;
    overlaySyncStatus.textContent = '';
    updateOverlaySliderRange();
}

// --- Web Audio graph ---
function setupAudioGraph() {
    if (_vidSource) return;
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    _vidSource = audioCtx.createMediaElementSource(getActiveVideo());
    _vidGain = audioCtx.createGain();
    _audGain = audioCtx.createGain();
    _vidSource.connect(_vidGain);
    _vidGain.connect(audioCtx.destination);
    _audGain.connect(audioCtx.destination);
    _vidGain.gain.value = overlayVideoVolume;
    _audGain.gain.value = overlayAudioVolume;
}

function teardownAudioGraph() {
    if (_vidSource) { try { _vidSource.disconnect(); } catch(e) {}; _vidSource = null; }
    if (_vidGain) { try { _vidGain.disconnect(); } catch(e) {}; _vidGain = null; }
    if (_audGain) { try { _audGain.disconnect(); } catch(e) {}; _audGain = null; }
}

function stopSource() {
    if (_sourceNode) { try { _sourceNode.stop(); } catch(e) {}; _sourceNode = null; }
}

function startAudioTrack() {
    if (!isOverlayMode || !overlayAudioBuffer || !audioCtx) return;
    stopSource();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    setupAudioGraph();

    var v = getActiveVideo();
    var vidTime = v.currentTime;
    var audioStart = vidTime + overlayOffset;
    _sourceNode = audioCtx.createBufferSource();
    _sourceNode.buffer = overlayAudioBuffer;
    _sourceNode.connect(_audGain);

    if (audioStart < 0) {
        _sourceNode.start(0, -audioStart);
    } else if (audioStart < overlayAudioBuffer.duration) {
        _sourceNode.start(0, audioStart);
    }
    // If audioStart >= duration, don't play (audio comes after video ends)
}

// --- Hook into existing playback ---
function hookPlayback() {
    videoPlayer.addEventListener('play', onOverlayPlay);
    videoPlayer.addEventListener('pause', onOverlayPause);
    videoPlayer.addEventListener('seeked', onOverlaySeeked);
    cutVideo.addEventListener('play', onOverlayPlay);
    cutVideo.addEventListener('pause', onOverlayPause);
    cutVideo.addEventListener('seeked', onOverlaySeeked);
}

function unhookPlayback() {
    videoPlayer.removeEventListener('play', onOverlayPlay);
    videoPlayer.removeEventListener('pause', onOverlayPause);
    videoPlayer.removeEventListener('seeked', onOverlaySeeked);
    cutVideo.removeEventListener('play', onOverlayPlay);
    cutVideo.removeEventListener('pause', onOverlayPause);
    cutVideo.removeEventListener('seeked', onOverlaySeeked);
}

function onOverlayPlay() { startAudioTrack(); }
function onOverlayPause() { stopSource(); }
function onOverlaySeeked() {
    if (getActiveVideo().paused) return;
    startAudioTrack();
}

// --- Auto-sync ---
overlayAutoSyncBtn.addEventListener('click', async function() {
    if (!overlayAudioBuffer || !currentVideo) return;
    getActiveVideo().pause();
    stopSource();
    overlaySyncStatus.textContent = 'Analyzing...';
    overlayAutoSyncBtn.disabled = true;

    try {
        var durV = getActiveVideo().duration || 0;
        var vidSrc = currentVideoBlob || '/api/video/' + encodeURIComponent(currentVideo.name);
        var roughV = await extractWaveform(vidSrc, durV, 200, 5);
        if (!roughV) throw new Error('Could not read video audio');

        var roughA = extractWaveformFromBuffer(overlayAudioBuffer, 200, 5);
        var onsetV = trimLeadingSilence(roughV);
        var onsetA = trimLeadingSilence(roughA);

        overlaySyncStatus.textContent = 'Finding alignment...';
        var roughOffset = crossCorrelate(roughV, roughA);
        if (roughOffset === null) throw new Error('No match found');

        overlaySyncStatus.textContent = 'Fine-tuning...';
        var fineV = await extractWaveform(vidSrc, durV, 1000, 2);
        var fineA = extractWaveformFromBuffer(overlayAudioBuffer, 1000, 2);
        trimLeadingSilenceAt(fineV, onsetV);
        trimLeadingSilenceAt(fineA, onsetA);
        var onsetCorrection = onsetA - onsetV;
        overlayOffset = Math.round((fineTune(fineV, fineA, roughOffset) + onsetCorrection) * 100) / 100;

        overlayOffsetSlider.value = overlayOffset;
        overlayOffsetVal.textContent = overlayOffset.toFixed(2) + 's';
        overlaySyncStatus.textContent = 'Synced! Offset: ' + overlayOffset.toFixed(2) + 's';
    } catch(e) {
        overlaySyncStatus.textContent = 'Sync failed: ' + (e.message || 'unknown');
    }
    overlayAutoSyncBtn.disabled = false;
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

// --- Library intercept for overlay audio selection ---
videoList.addEventListener('click', function(e) {
    if (!isOverlayMode) return;
    var li = e.target.closest('li');
    if (!li) return;
    var name = li.getAttribute('data-name');
    if (!name) return;
    loadAudioFromLibraryFile(name);
    e.stopPropagation();
    e.preventDefault();
}, true);

// --- Export ---
overlayExportBtn.addEventListener('click', async function() {
    if (!currentVideo || !overlayAudioFilename) {
        overlayExportProgress.style.display = 'block';
        overlayExportProgress.textContent = 'Load a video and audio track first.';
        setTimeout(function() { overlayExportProgress.style.display = 'none'; }, 3000);
        return;
    }
    overlayExportBtn.disabled = true;
    overlayExportProgress.style.display = 'block';
    overlayExportProgress.textContent = 'Exporting... this may take a minute.';

    try {
        var resp = await fetch('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                video: currentVideo.name,
                audio: overlayAudioFilename,
                offset: overlayOffset,
                videoVol: overlayVideoVolume,
                audioVol: overlayAudioVolume
            })
        });
        var data = await resp.json();
        if (data.error) {
            overlayExportProgress.textContent = 'Export failed: ' + data.error;
        } else {
            overlayExportProgress.textContent = 'Exported: ' + data.filename;
            var a = document.createElement('a');
            a.href = '/api/export/' + encodeURIComponent(data.filename);
            a.download = data.filename;
            a.click();
            renderLibrary();
        }
    } catch(e) {
        overlayExportProgress.textContent = 'Export failed: ' + e.message;
    }
    overlayExportBtn.disabled = false;
});
