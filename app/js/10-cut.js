// ============================================================
// Cut Section
// ============================================================
function updateCutDisplay() {
    if (cutStartTime !== null && cutEndTime !== null) {
        cutEmpty.style.display = 'none';
        cutTimes.style.display = '';
        cutTimes.innerHTML = 'Start: <span>' + formatTimePrecise(cutStartTime) + '</span> &middot; End: <span>' + formatTimePrecise(cutEndTime) + '</span>';
    } else if (cutStartTime !== null) {
        cutEmpty.style.display = 'none';
        cutTimes.style.display = '';
        cutTimes.innerHTML = 'Start: <span>' + formatTimePrecise(cutStartTime) + '</span> &middot; End: —';
    } else if (cutEndTime !== null) {
        cutEmpty.style.display = 'none';
        cutTimes.style.display = '';
        cutTimes.innerHTML = 'Start: — &middot; End: <span>' + formatTimePrecise(cutEndTime) + '</span>';
    } else {
        cutEmpty.style.display = '';
        cutTimes.style.display = 'none';
    }
}

function updateCutPlayBtn() {
    if (isCutActive) {
        cutPlayBtn.classList.add('active');
        cutPlayBtn.textContent = 'Cut: On';
    } else {
        cutPlayBtn.classList.remove('active');
        cutPlayBtn.textContent = 'Cut: Off';
    }
}

function saveCutTimes() {
    if (!currentVideo) return;
    try {
        localStorage.setItem('mirror-cut-' + currentVideo.name, JSON.stringify({
            start: cutStartTime, end: cutEndTime
        }));
    } catch(e) {}
}

cutStartBtn.addEventListener('click', function() {
    var v = getActiveVideo();
    if (!v || isNaN(v.currentTime)) return;
    cutStartTime = v.currentTime;
    if (cutEndTime !== null && cutEndTime <= cutStartTime) cutEndTime = null;
    cutPrepped = false;
    updateCutDisplay();
    updateLoopDisplay();
    saveCutTimes();
});

cutEndBtn.addEventListener('click', function() {
    var v = getActiveVideo();
    if (!v || isNaN(v.currentTime)) return;
    cutEndTime = v.currentTime;
    if (cutStartTime !== null && cutStartTime >= cutEndTime) cutStartTime = null;
    cutPrepped = false;
    updateCutDisplay();
    updateLoopDisplay();
    saveCutTimes();
});

cutPlayBtn.addEventListener('click', function() {
    if (cutStartTime === null || cutEndTime === null) return;
    isCutActive = !isCutActive;
    updateCutPlayBtn();
    updateLoopDisplay();
    if (!isCutActive) {
        if (isOnCutVideo) switchToMain(cutVideo.currentTime);
        return;
    }
    // Disable loop if entirely inside cut zone
    if (isLoopPlaying && loopStartTime !== null && loopEndTime !== null) {
        if (loopStartTime >= cutStartTime && loopEndTime <= cutEndTime) {
            isLoopPlaying = false;
            updateLoopPlayBtn();
            updateLoopDisplay();
        }
    }
    // Jump back so user can see the seamless transition
    var ct = getActiveVideo().currentTime;
    if (ct >= cutStartTime) {
        var goTo = Math.max(0, cutStartTime - 2);
        if (isOnCutVideo) switchToMain(goTo);
        else getActiveVideo().currentTime = goTo;
        cutPrepped = false;
        if (isCompareMode && videoBLoaded) {
            var bGoTo = goTo + syncOffset;
            if (inSyncRange(bGoTo)) videoPlayerB.currentTime = bGoTo;
        }
    }
    startLoopRAF();
});

// Nudge cut times by one frame (1/30s)
var FRAME = 1 / 30;
function nudgeCut(which, dir) {
    var time = which === 'start' ? cutStartTime : cutEndTime;
    if (time === null) return;
    var newTime = Math.max(0, time + dir * FRAME);
    if (which === 'start') {
        if (cutEndTime !== null && cutEndTime <= newTime) return;
        cutStartTime = newTime;
    } else {
        if (cutStartTime !== null && cutStartTime >= newTime) return;
        cutEndTime = newTime;
    }
    updateCutDisplay();
    updateLoopDisplay();
    saveCutTimes();
}
cutStartLeft.addEventListener('click', function() { nudgeCut('start', -1); });
cutStartRight.addEventListener('click', function() { nudgeCut('start', 1); });
cutEndLeft.addEventListener('click', function() { nudgeCut('end', -1); });
cutEndRight.addEventListener('click', function() { nudgeCut('end', 1); });

// Use RAF for frame-accurate loop/cut checks (timeupdate fires too slowly)
var loopRAF = null;
var cutPrepped = false;
var isOnCutVideo = false;
function loopCheckRAF() {
    loopRAF = null;
    var v = isOnCutVideo ? cutVideo : videoPlayer;
    if (!v || v.readyState < 1) return;
    var ct = v.currentTime;
    var active = false;

    // Loop: jump back when reaching loop end
    if (isLoopPlaying && loopStartTime !== null && loopEndTime !== null) {
        var effEnd = loopEndTime;
        var effStart = loopStartTime;
        if (isCutActive && cutStartTime !== null && cutEndTime !== null) {
            if (loopEndTime > cutStartTime && loopEndTime <= cutEndTime) effEnd = cutStartTime;
            if (loopStartTime >= cutStartTime && loopStartTime < cutEndTime) effStart = cutEndTime;
        }
        if (ct >= effEnd || ct < effStart) {
            cutPrepped = false;
            if (isOnCutVideo) { switchToMain(effStart); }
            else if (isCompareMode && videoBLoaded) { syncSeek(effStart); return; }
            else { videoPlayer.currentTime = effStart; }
        }
        active = true;
    }

    // Cut: pre-position cut video when approaching, switch when main enters cut zone
    if (isCutActive && cutStartTime !== null && cutEndTime !== null && !isOnCutVideo) {
        var dist = cutStartTime - ct;
        if (dist > 0 && dist < 2) {
            if (!cutPrepped) {
                cutVideo.currentTime = cutEndTime;
                cutPrepped = true;
            }
            active = true;
        } else if (ct >= cutStartTime && ct < cutEndTime) {
            // Main video is in the cut zone — switch if cutVideo seek is done
            if (cutPrepped && !cutVideo.seeking) {
                switchToCut();
            }
        } else if (dist >= 2 && cutPrepped) {
            cutPrepped = false;
        }
    }

    if (active || isCutActive) loopRAF = requestAnimationFrame(loopCheckRAF);
}

function switchToCut() {
    var wasPlaying = !videoPlayer.paused;
    var wasMuted = videoPlayer.muted;
    videoPlayer.muted = true;
    cutVideo.style.display = '';
    cutVideo.style.opacity = '1';
    cutVideo.style.pointerEvents = 'auto';
    cutVideo.playbackRate = videoPlayer.playbackRate;
    cutVideo.muted = wasMuted;
    if (wasPlaying) cutVideo.play();
    setTimeout(function() {
        videoPlayer.pause();
        videoPlayer.muted = wasMuted;
    }, 15);
    videoPlayer.style.opacity = '0';
    videoPlayer.style.pointerEvents = 'none';
    isOnCutVideo = true;
    updateTimeDisplay();
}

function switchToMain(time) {
    var wasPlaying = !cutVideo.paused;
    var wasMuted = cutVideo.muted;
    cutVideo.muted = true;
    cutVideo.style.pointerEvents = 'none';
    videoPlayer.style.opacity = '1';
    videoPlayer.style.pointerEvents = '';
    videoPlayer.currentTime = time;
    videoPlayer.playbackRate = cutVideo.playbackRate;
    if (wasPlaying) videoPlayer.play();
    setTimeout(function() {
        cutVideo.pause();
        cutVideo.muted = wasMuted;
    }, 15);
    cutVideo.style.display = 'none';
    cutVideo.style.opacity = '0';
    isOnCutVideo = false;
    cutPrepped = false;
    updateTimeDisplay();
}

function startLoopRAF() {
    if (!loopRAF) loopRAF = requestAnimationFrame(loopCheckRAF);
}
