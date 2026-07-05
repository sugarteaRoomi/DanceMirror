// ============================================================
// Compare Mode — two videos side by side with audio sync
// ============================================================
const compareBtn = document.getElementById('compareBtn');
const videoBArea = document.getElementById('videoBArea');
const videoPlayerB = document.getElementById('videoPlayerB');
const videoWrapB = document.getElementById('videoWrapB');
const fsContainerB = document.getElementById('fsContainerB');
const videoOverlayB = document.getElementById('videoOverlayB');
const timeDisplayB = document.getElementById('timeDisplayB');
const durationDisplayB = document.getElementById('durationDisplayB');
const seekBarB = document.getElementById('seekBarB');
const seekInputB = document.getElementById('seekInputB');
const seekProgressB = document.getElementById('seekProgressB');
const seekBufferedB = document.getElementById('seekBufferedB');
const seekTooltipB = document.getElementById('seekTooltipB');
const syncOffsetSlider = document.getElementById('syncOffsetSlider');
const syncOffsetVal = document.getElementById('syncOffsetVal');
const autoSyncBtn = document.getElementById('autoSyncBtn');
const syncStatus = document.getElementById('syncStatus');
const compareControls = document.getElementById('compareControls');
var isCompareMode = false;
var videoBLoaded = false;
var currentVideoB = null;
var syncOffset = 0;

function updateOffsetSliderRange() {
    var durA = videoPlayer.duration || 0;
    var durB = videoPlayerB.duration || 0;
    if (durA > 0 && durB > 0) {
        syncOffsetSlider.min = -Math.round(durA);
        syncOffsetSlider.max = Math.round(durB);
        syncOffsetSlider.step = Math.max(0.1, Math.round(Math.min(durA, durB) / 500) / 10);
    }
}

function loadVideoB(src, name, size, blob) {
    videoPlayerB.src = src;
    videoPlayerB.load();
    videoBLoaded = true;
    currentVideoB = name;
    videoBBlob = blob || null;
    
    videoPlayerB.playbackRate = currentSpeed;
    if (isMirroredB) { videoWrapB.classList.add('mirrored'); mirrorBtnB.classList.add('mirrored-active'); }
    else { videoWrapB.classList.remove('mirrored'); mirrorBtnB.classList.remove('mirrored-active'); }
    videoPlayerB.addEventListener('loadedmetadata', updateOffsetSliderRange, { once: true });
}

async function loadVideoBFromLibrary(filename) {
    var url = '/api/video/' + encodeURIComponent(filename);
    fetch('/api/videos').then(function(r) { return r.json(); }).then(function(files) {
        var found = files.find(function(f) { return f.name === filename; });
        var size = found ? found.size : 0;
        loadVideoB(url, filename, size, null);
        renderLibrary();
    });
}

function updateVideoBTimeDisplay() {
    var cur = videoPlayerB.currentTime || 0;
    var dur = videoPlayerB.duration || 0;
    timeDisplayB.textContent = formatTime(cur);
    if (isNaN(dur) || !isFinite(dur)) {
        durationDisplayB.textContent = '0:00';
        seekInputB.max = 1000; seekInputB.value = 0; seekProgressB.style.width = '0%';
    } else {
        durationDisplayB.textContent = formatTime(dur);
        var pct = dur > 0 ? (cur / dur) * 1000 : 0;
        seekInputB.max = 1000; seekInputB.value = Math.round(pct);
        seekProgressB.style.width = (pct / 10) + '%';
    }
    if (videoPlayerB.buffered && videoPlayerB.buffered.length > 0) {
        var bufEnd = videoPlayerB.buffered.end(videoPlayerB.buffered.length - 1);
        var bufPct = dur > 0 ? (bufEnd / dur) * 100 : 0;
        seekBufferedB.style.width = bufPct + '%';
    }
}

videoPlayerB.addEventListener('timeupdate', updateVideoBTimeDisplay);
videoPlayerB.addEventListener('loadedmetadata', updateVideoBTimeDisplay);

// Video B seek bar is display-only — synced from video A
seekBarB.style.pointerEvents = 'none';
seekBarB.style.opacity = '0.5';

seekBarB.addEventListener('mousemove', function(e) {
    var dur = videoPlayerB.duration || 0;
    if (!dur) return;
    var rect = seekBarB.getBoundingClientRect();
    var pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    seekTooltipB.textContent = formatTime(pct * dur);
    seekTooltipB.style.left = (pct * 100) + '%';
    seekTooltipB.classList.add('visible');
});

seekBarB.addEventListener('mouseleave', function() { seekTooltipB.classList.remove('visible'); });

var waitingForB = false;
var startBTimer = null;
function scheduleBStart() {
    var syncV = getSyncVideo();
    var remaining = -syncOffset - syncV.currentTime;
    if (remaining <= 0) {
        videoPlayerB.currentTime = syncV.currentTime + syncOffset;
        videoPlayerB.play();
        waitingForB = false;
        return;
    }
    var delayMs = remaining * 1000 / currentSpeed;
    startBTimer = setTimeout(function() {
        videoPlayerB.currentTime = 0;
        videoPlayerB.play();
        waitingForB = false;
    }, delayMs);
}

var _syncing = false;
// Loop: on end, seek back to 0 so B stays synced (listen on both cutVideo and videoPlayer)
function _handleEnded() {
    if (!isLooping) return;
    var syncV = getSyncVideo();
    if (isCompareMode && videoBLoaded) {
        _syncing = true;
        syncV.currentTime = 0;
        videoPlayerB.currentTime = Math.max(0, Math.min(syncOffset, videoPlayerB.duration || Infinity));
        var _d = 0;
        function _r() {
            _d++;
            if (_d < 2) return;
            _syncing = false;
            syncV.play();
            if (inSyncRange(syncOffset)) { videoPlayerB.play(); }
            else if (syncOffset < 0) { waitingForB = true; scheduleBStart(); }
        }
        syncV.addEventListener('seeked', _r, { once: true });
        videoPlayerB.addEventListener('seeked', _r, { once: true });
        setTimeout(function() { if (_d < 2) { _syncing = false; _r(); } if (_d < 2) { _r(); } }, 200);
    } else {
        seekToTime(0);
        syncV.play();
    }
}
videoPlayer.addEventListener('ended', _handleEnded);
cutVideo.addEventListener('ended', _handleEnded);

function getSyncVideo() {
    return isOnCutVideo ? cutVideo : videoPlayer;
}

function syncPlayPause() {
    var syncV = getSyncVideo();
    if (syncV.paused) {
        if (isCompareMode && videoBLoaded) {
            var bt = syncV.currentTime + syncOffset;
            if (inSyncRange(bt)) {
                syncV.play();
                videoPlayerB.play();
            } else if (bt < 0) {
                syncV.play();
                videoPlayerB.currentTime = 0;
                waitingForB = true;
                scheduleBStart();
            } else {
                syncV.play();
            }
        } else {
            syncV.play();
        }
    } else {
        syncV.pause();
        if (isCompareMode && videoBLoaded) videoPlayerB.pause();
        if (waitingForB) { waitingForB = false; clearTimeout(startBTimer); }
    }
}

function inSyncRange(bt) {
    return bt >= 0 && bt <= (videoPlayerB.duration || Infinity);
}

function syncSeek(time) {
    if (waitingForB) { waitingForB = false; clearTimeout(startBTimer); }

    var syncV = getSyncVideo();
    var bt = time + syncOffset;
    var wasPlaying = !syncV.paused;
    var canPlayB = isCompareMode && videoBLoaded && inSyncRange(bt);

    if (isCompareMode && videoBLoaded && wasPlaying) {
        _syncing = true;
        syncV.pause();
        videoPlayerB.pause();
        syncV.currentTime = time;
        videoPlayerB.currentTime = Math.max(0, Math.min(bt, videoPlayerB.duration || Infinity));

        var done = 0;
        function onBothSeeked() {
            done++;
            if (done < 2) return;
            _syncing = false;
            syncV.play();
            if (isLoopPlaying) startLoopRAF();
            if (canPlayB) {
                videoPlayerB.play();
            } else if (bt < 0) {
                waitingForB = true;
                scheduleBStart();
            }
        }
        syncV.addEventListener('seeked', onBothSeeked, { once: true });
        videoPlayerB.addEventListener('seeked', onBothSeeked, { once: true });
    } else {
        syncV.currentTime = time;
        if (isCompareMode && videoBLoaded) {
            videoPlayerB.currentTime = Math.max(0, Math.min(bt, videoPlayerB.duration || Infinity));
            if (bt < 0 && wasPlaying) {
                waitingForB = true;
                scheduleBStart();
            }
        }
    }
}

var compareTarget = 'A';
var compareTargetLabel = document.getElementById('compareTargetLabel');
var targetABtn = document.getElementById('targetABtn');
var targetBBtn = document.getElementById('targetBBtn');

function updateTargetButtons() {
    if (compareTarget === 'A') {
        targetABtn.classList.add('active'); targetBBtn.classList.remove('active');
    } else {
        targetBBtn.classList.add('active'); targetABtn.classList.remove('active');
    }
}
targetABtn.addEventListener('click', function() { compareTarget = 'A'; updateTargetButtons(); renderLibrary(); });
targetBBtn.addEventListener('click', function() { compareTarget = 'B'; updateTargetButtons(); renderLibrary(); });


compareBtn.addEventListener('click', function() {
    isCompareMode = !isCompareMode;
    if (isCompareMode) {
        playerLayout.classList.add('compare-active');
        compareBtn.classList.add('active');
        compareBtn.textContent = 'Compare Mode: On';
        compareTargetLabel.style.display = '';
        updateTargetButtons();
        renderLibrary();
        if (currentVideo && !videoBLoaded) {
            var urlB = '/api/video/' + encodeURIComponent(currentVideo.name);
            loadVideoB(urlB, currentVideo.name, currentVideo.size, currentVideoBlob);
            compareTarget = 'B';
            updateTargetButtons();
            renderLibrary();
        }
    } else {
        playerLayout.classList.remove('compare-active');
        compareBtn.classList.remove('active');
        compareBtn.textContent = 'Compare Mode: Off';
        compareTargetLabel.style.display = 'none';
        if (videoBLoaded) videoPlayerB.pause();
        videoBLoaded = false;
        currentVideoB = null;
        videoBBlob = null;
        renderLibrary();
    }
});

// Sync offset slider
syncOffsetSlider.addEventListener('input', function() {
    syncOffset = parseFloat(this.value);
    syncOffsetVal.textContent = syncOffset.toFixed(2) + 's';
});
syncOffsetVal.textContent = '0.00s';

var offsetLeftBtn = document.getElementById('offsetLeftBtn');
var offsetRightBtn = document.getElementById('offsetRightBtn');
function nudgeOffset(dir) {
    var step = parseFloat(syncOffsetSlider.step) || 0.1;
    syncOffset = Math.round((syncOffset + dir * step) * 100) / 100;
    syncOffset = Math.max(parseFloat(syncOffsetSlider.min), Math.min(parseFloat(syncOffsetSlider.max), syncOffset));
    syncOffsetSlider.value = syncOffset;
    syncOffsetVal.textContent = syncOffset.toFixed(2) + 's';
}
offsetLeftBtn.addEventListener('click', function() { nudgeOffset(-1); });
offsetRightBtn.addEventListener('click', function() { nudgeOffset(1); });
function nudgeOffsetFine(dir) {
    var step = 1 / 30;
    syncOffset = Math.round((syncOffset + dir * step) * 100) / 100;
    syncOffset = Math.max(parseFloat(syncOffsetSlider.min), Math.min(parseFloat(syncOffsetSlider.max), syncOffset));
    syncOffsetSlider.value = syncOffset;
    syncOffsetVal.textContent = syncOffset.toFixed(2) + 's';
}
document.getElementById('offsetFineLeftBtn').addEventListener('click', function() { nudgeOffsetFine(-1); });
document.getElementById('offsetFineRightBtn').addEventListener('click', function() { nudgeOffsetFine(1); });

// Auto Sync via audio fingerprinting
autoSyncBtn.addEventListener('click', async function() {
    if (!videoBLoaded || !currentVideo) return;
    getSyncVideo().pause();
    videoPlayerB.pause();
    syncStatus.textContent = 'Analyzing audio...';
    autoSyncBtn.disabled = true;
    try {
        var offset = await autoSync(videoPlayer, videoPlayerB);
        if (offset !== null) {
            syncOffset = Math.round(offset * 100) / 100;
            syncOffsetSlider.value = Math.max(parseFloat(syncOffsetSlider.min), Math.min(parseFloat(syncOffsetSlider.max), syncOffset));
            syncOffsetVal.textContent = syncOffset.toFixed(2) + 's';
            syncStatus.textContent = 'Synced! Offset: ' + syncOffset.toFixed(2) + 's';
            syncStatus.style.color = 'var(--accent)';
            syncStatus.style.fontWeight = '600';
            setTimeout(function() { syncStatus.style.color = ''; syncStatus.style.fontWeight = ''; }, 2000);

            jumpToSyncStart();
            // Wait for both seeks to land, then play
            var _rdy = 0, _done = false;
            function _resume() { if (_done) return; _rdy++; if (_rdy >= 2) { _done = true; syncPlayPause(); } }
            getSyncVideo().addEventListener('seeked', _resume, { once: true });
            videoPlayerB.addEventListener('seeked', _resume, { once: true });
            setTimeout(function() { if (!_done) { _done = true; syncPlayPause(); } }, 1000);
        } else {
            syncStatus.textContent = 'No match found. Try manual sync.';
            syncPlayPause();
        }
    } catch(e) {
        syncStatus.textContent = 'Sync failed: ' + (e.message || 'unknown error');
    }
    autoSyncBtn.disabled = false;
});

