// ============================================================
// Create Mix — combine dance cover video with external audio
// Uses a second <video> element synced exactly like Compare mode
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
var mixAudioVideo = document.getElementById('mixAudioVideo');

var mixVideoName = null;
var mixAudioName = null;
var mixAudioObjectURL = null;
var mixOffset = 0;
var mixVideoVolume = 1;
var mixAudioVolume = 1;
var _picking = null;
var _mixSyncing = false;

// --- Open/Close ---
createMixBtn.addEventListener('click', function() {
    // Turn off compare mode if active, then lock it out while mixing
    if (typeof isCompareMode !== 'undefined' && isCompareMode) {
        compareBtn.click();
    }
    if (typeof closeCutPanel === 'function') closeCutPanel();
    if (typeof compareBtn !== 'undefined') compareBtn.disabled = true;
    if (typeof cutBtn !== 'undefined') cutBtn.disabled = true;
    mixPanel.style.display = 'block';
    createMixBtn.style.display = 'none';
});
mixCloseBtn.addEventListener('click', closeMixPanel);

function closeMixPanel() {
    getActiveVideo().pause();
    mixAudioVideo.pause();
    if (mixAudioObjectURL) { URL.revokeObjectURL(mixAudioObjectURL); mixAudioObjectURL = null; }
    mixAudioVideo.removeAttribute('src');
    mixAudioVideo.load();
    getActiveVideo().volume = 1;
    if (typeof compareBtn !== 'undefined') compareBtn.disabled = false;
    if (typeof cutBtn !== 'undefined') cutBtn.disabled = false;
    mixPanel.style.display = 'none';
    createMixBtn.style.display = '';
    mixVideoName = null;
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

// --- Audio source (loaded into hidden video element) ---
mixAudioUploadBtn.addEventListener('click', function() { mixAudioFile.click(); });
mixAudioFile.addEventListener('change', async function() {
    var f = mixAudioFile.files[0];
    if (!f) return;
    mixAudioFile.value = '';
    mixAudioLabel.textContent = 'Uploading...';
    var form = new FormData();
    form.append('file', f);
    var resp = await fetch('/api/upload', { method: 'POST', body: form });
    var data = await resp.json();
    if (data.error) { mixAudioLabel.textContent = 'Upload failed'; return; }
    if (mixAudioObjectURL) URL.revokeObjectURL(mixAudioObjectURL);
    mixAudioObjectURL = URL.createObjectURL(f);
    mixAudioVideo.src = mixAudioObjectURL;
    mixAudioName = data.filename;
    mixAudioLabel.textContent = data.filename;
    tryShowMixControls();
});

async function loadMixAudioFromLibrary(name) {
    mixAudioLabel.textContent = 'Loading audio...';
    mixAudioVideo.src = '/api/video/' + encodeURIComponent(name);
    mixAudioName = name;
    mixAudioLabel.textContent = name;
    tryShowMixControls();
}

function tryShowMixControls() {
    if (mixVideoName && mixAudioName) {
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
    var durA = mixAudioVideo.duration || 0;
    if (isNaN(durA) || !isFinite(durA)) durA = 0;
    mixOffsetSlider.min = -Math.round(durA);
    mixOffsetSlider.max = Math.round(durV);
    mixOffsetSlider.value = mixOffset;
    mixOffsetVal.textContent = mixOffset.toFixed(2) + 's';
}
mixAudioVideo.addEventListener('loadedmetadata', function() { updateMixOffsetRange(); });

// --- Volume & offset ---
mixVideoVol.addEventListener('input', function() {
    mixVideoVolume = parseFloat(this.value);
    mixVideoVolVal.textContent = Math.round(mixVideoVolume * 100) + '%';
    getActiveVideo().volume = mixVideoVolume;
});
mixAudioVol.addEventListener('input', function() {
    mixAudioVolume = parseFloat(this.value);
    mixAudioVolVal.textContent = Math.round(mixAudioVolume * 100) + '%';
    mixAudioVideo.volume = mixAudioVolume;
});
mixOffsetSlider.addEventListener('input', function() {
    mixOffset = parseFloat(this.value);
    mixOffsetVal.textContent = mixOffset.toFixed(2) + 's';
    // Re-sync live if currently playing
    if (!getActiveVideo().paused) syncMixSeek(getActiveVideo().currentTime);
});

function nudgeMixOffset(amount) {
    mixOffset = Math.round((mixOffset + amount) * 100) / 100;
    mixOffset = Math.max(parseFloat(mixOffsetSlider.min), Math.min(parseFloat(mixOffsetSlider.max), mixOffset));
    mixOffsetSlider.value = mixOffset;
    mixOffsetVal.textContent = mixOffset.toFixed(2) + 's';
    if (!getActiveVideo().paused) syncMixSeek(getActiveVideo().currentTime);
}
document.getElementById('mixOffsetLeftBtn').addEventListener('click', function() { nudgeMixOffset(-1); });
document.getElementById('mixOffsetRightBtn').addEventListener('click', function() { nudgeMixOffset(1); });
document.getElementById('mixOffsetFineLeftBtn').addEventListener('click', function() { nudgeMixOffset(-1/30); });
document.getElementById('mixOffsetFineRightBtn').addEventListener('click', function() { nudgeMixOffset(1/30); });

// --- Sync (mirrors Compare mode syncSeek/syncPlayPause + scheduleBStart) ---
var _mixWaiting = false;
var _mixWaitTimer = null;

function mixAudioTarget() {
    return getActiveVideo().currentTime + mixOffset;
}

function clearMixWait() {
    _mixWaiting = false;
    if (_mixWaitTimer) { clearTimeout(_mixWaitTimer); _mixWaitTimer = null; }
}

// Audio starts AFTER the video (negative offset, e.g. cheering intro).
// Mirrors Compare mode's scheduleBStart exactly (setTimeout, not rAF).
function scheduleMixAudioStart() {
    clearMixWait();
    var v = getActiveVideo();
    var remaining = -mixOffset - v.currentTime;
    if (remaining <= 0) {
        mixAudioVideo.currentTime = v.currentTime + mixOffset;
        mixAudioVideo.play();
        _mixWaiting = false;
        return;
    }
    _mixWaiting = true;
    var delayMs = remaining * 1000 / (v.playbackRate || 1);
    _mixWaitTimer = setTimeout(function() {
        if (v.paused) { _mixWaiting = false; _mixWaitTimer = null; return; }
        mixAudioVideo.currentTime = 0;
        mixAudioVideo.play();
        _mixWaiting = false;
        _mixWaitTimer = null;
    }, delayMs);
}

function syncMixPlayPause() {
    if (!mixVideoName || !mixAudioName) return;
    var v = getActiveVideo();
    if (v.paused) {
        v.volume = mixVideoVolume;
        mixAudioVideo.volume = mixAudioVolume;
        mixAudioVideo.playbackRate = v.playbackRate || 1;
        var bt = mixAudioTarget();
        if (bt >= 0 && bt <= (mixAudioVideo.duration || Infinity)) {
            // Seek audio to position, then play both together (like Compare mode)
            mixAudioVideo.currentTime = bt;
            _mixSyncing = true;
            var _done = false;
            function _playBoth() { if (_done) return; _done = true; _mixSyncing = false; v.play(); mixAudioVideo.play(); }
            mixAudioVideo.addEventListener('seeked', _playBoth, { once: true });
            setTimeout(_playBoth, 200);
        } else if (bt < 0) {
            // Video starts before the audio's music — pre-position audio, wait, then play
            v.play();
            mixAudioVideo.currentTime = 0;
            _mixWaiting = true;
            scheduleMixAudioStart();
        } else {
            // Audio already ended
            v.play();
        }
    } else {
        v.pause();
        mixAudioVideo.pause();
        clearMixWait();
    }
}

function syncMixSeek(time) {
    if (!mixVideoName || !mixAudioName) return;
    var v = getActiveVideo();
    var bt = time + mixOffset;
    var wasPlaying = !v.paused;
    clearMixWait();
    v.pause();
    mixAudioVideo.pause();
    v.currentTime = time;
    mixAudioVideo.currentTime = Math.max(0, Math.min(bt, mixAudioVideo.duration || Infinity));

    if (wasPlaying) {
        _mixSyncing = true;
        var done = 0;
        function onSeeked() {
            done++;
            if (done < 2) return;
            _mixSyncing = false;
            v.play();
            if (bt >= 0 && bt <= (mixAudioVideo.duration || Infinity)) {
                mixAudioVideo.play();
            } else if (bt < 0) {
                scheduleMixAudioStart();
            }
        }
        v.addEventListener('seeked', onSeeked, { once: true });
        mixAudioVideo.addEventListener('seeked', onSeeked, { once: true });
        setTimeout(function() { if (done < 2) { _mixSyncing = false; onSeeked(); } }, 300);
    }
}

// Hook player seek bar / keyboard seeks to sync the audio
var _origSeekToTime = null;
videoPlayer.addEventListener('seeked', function() {
    if (mixControls.style.display !== 'block' || !mixAudioName || _mixSyncing) return;
    // Re-sync audio position after a seek
    if (!getActiveVideo().paused) {
        syncMixSeek(getActiveVideo().currentTime);
    }
});

// Play/pause/ended via events for video-click and loop
videoPlayer.addEventListener('pause', function() {
    if (mixControls.style.display === 'block') mixAudioVideo.pause();
});
videoPlayer.addEventListener('ended', function() {
    if (mixControls.style.display !== 'block' || !isLooping) return;
    var v = getActiveVideo();
    v.currentTime = 0;
    mixAudioVideo.currentTime = 0;
    v.play();
    // If audio starts after the video (negative offset), wait for it
    if (mixOffset < 0) scheduleMixAudioStart();
    else mixAudioVideo.play();
});

// --- Auto-sync (same algorithm as Compare mode) ---
mixAutoSyncBtn.addEventListener('click', async function() {
    if (!mixAudioName || !mixVideoName) return;
    var v = getActiveVideo();
    if (!v.duration || isNaN(v.duration)) { mixSyncStatus.textContent = 'Wait for video to load first.'; return; }
    v.pause();
    mixAudioVideo.pause();
    mixSyncStatus.textContent = 'Analyzing...';
    mixAutoSyncBtn.disabled = true;

    try {
        var durV = v.duration;
        var vidSrc = '/api/video/' + encodeURIComponent(mixVideoName);
        var roughV = await extractWaveform(vidSrc, durV, 200, 5);
        if (!roughV) throw new Error('Could not read video audio');

        var audioSrc = mixAudioObjectURL || '/api/video/' + encodeURIComponent(mixAudioName);
        var roughA = await extractWaveform(audioSrc, durV + Math.abs(mixOffset) + 60, 200, 5);
        if (!roughA) throw new Error('Could not read audio track');

        var onsetV = trimLeadingSilence(roughV);
        var onsetA = trimLeadingSilence(roughA);

        mixSyncStatus.textContent = 'Finding alignment...';
        var roughOffset = crossCorrelate(roughV, roughA);
        if (roughOffset === null) throw new Error('No match found');

        mixSyncStatus.textContent = 'Fine-tuning...';
        var fineV = await extractWaveform(vidSrc, durV, 1000, 2);
        var fineA = await extractWaveform(audioSrc, durV + Math.abs(mixOffset) + 60, 1000, 2);
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
