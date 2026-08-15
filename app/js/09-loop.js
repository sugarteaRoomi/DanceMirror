// ============================================================
// Loop
// ============================================================
loopBtn.addEventListener('click', function() {
    isLooping = !isLooping;
    if (isLooping) {
        this.innerHTML = '&#x1f501; Loop: On';
        this.classList.add('active');
    } else {
        this.innerHTML = '&#x1f501; Loop: Off';
        this.classList.remove('active');
    }
});
loopBtn.classList.add('active');

// ============================================================
// Practice Loop — section loop with optional break between reps
// ============================================================
var _loopDelayTimer = null;
var _loopDelayCountdown = null;
var _loopDelayActive = false;

function clearLoopDelay() {
    _loopDelayActive = false;
    if (_loopDelayTimer) { clearTimeout(_loopDelayTimer); _loopDelayTimer = null; }
    if (_loopDelayCountdown) { clearInterval(_loopDelayCountdown); _loopDelayCountdown = null; }
}

function updateLoopDisplay() {
    if (loopStartTime !== null && loopEndTime !== null) {
        loopEmpty.style.display = 'none';
        loopTimes.style.display = '';
        loopTimes.innerHTML = 'Start: <span>' + formatTime(loopStartTime) + '</span> &middot; End: <span>' + formatTime(loopEndTime) + '</span>';
    } else if (loopStartTime !== null) {
        loopEmpty.style.display = 'none';
        loopTimes.style.display = '';
        loopTimes.innerHTML = 'Start: <span>' + formatTime(loopStartTime) + '</span> &middot; End: —';
    } else if (loopEndTime !== null) {
        loopEmpty.style.display = 'none';
        loopTimes.style.display = '';
        loopTimes.innerHTML = 'Start: — &middot; End: <span>' + formatTime(loopEndTime) + '</span>';
    } else {
        loopEmpty.style.display = '';
        loopTimes.style.display = 'none';
    }
}

function updateLoopPlayBtn() {
    if (isLoopPlaying) {
        loopPlayBtn.classList.add('active');
        loopPlayBtn.textContent = 'Loop: On';
    } else {
        loopPlayBtn.classList.remove('active');
        loopPlayBtn.textContent = 'Play Loop';
    }
}

function saveLoopTimes() {
    if (!currentVideo) return;
    try {
        localStorage.setItem('mirror-loop-' + currentVideo.name, JSON.stringify({
            start: loopStartTime, end: loopEndTime, delay: loopDelay
        }));
    } catch(e) {}
}

loopStartBtn.addEventListener('click', function() {
    var v = getActiveVideo();
    if (!v || isNaN(v.currentTime)) return;
    loopStartTime = v.currentTime;
    if (loopEndTime !== null && loopEndTime <= loopStartTime) loopEndTime = null;
    updateLoopDisplay();
    saveLoopTimes();
});

loopEndBtn.addEventListener('click', function() {
    var v = getActiveVideo();
    if (!v || isNaN(v.currentTime)) return;
    loopEndTime = v.currentTime;
    if (loopStartTime !== null && loopStartTime >= loopEndTime) loopStartTime = null;
    updateLoopDisplay();
    saveLoopTimes();
});

loopPlayBtn.addEventListener('click', function() {
    if (loopStartTime === null || loopEndTime === null) return;
    isLoopPlaying = !isLoopPlaying;
    clearLoopDelay();
    updateLoopPlayBtn();
    updateLoopDisplay();
    if (isLoopPlaying) {
        var v = getActiveVideo();
        if (!v || isNaN(v.currentTime)) return;
        if (v.currentTime < loopStartTime || v.currentTime >= loopEndTime) {
            v.currentTime = loopStartTime;
        }
        v.play();
    }
});

loopDelayInput.addEventListener('input', function() {
    var val = parseFloat(this.value);
    loopDelay = (isNaN(val) || val < 0) ? 0 : val;
});
loopDelayInput.addEventListener('change', function() {
    var val = parseFloat(this.value);
    if (isNaN(val) || val < 0) val = 0;
    loopDelay = val;
    this.value = val;
    saveLoopTimes();
});

// Section loop: when we hit the end, restart immediately or pause for a break.
videoPlayer.addEventListener('timeupdate', function() {
    if (!isLoopPlaying || _loopDelayActive) return;
    if (loopStartTime === null || loopEndTime === null) return;
    if (videoPlayer.currentTime >= loopEndTime) {
        if (loopDelay > 0) {
            startLoopDelay();
        } else {
            videoPlayer.currentTime = loopStartTime;
        }
    }
});

function startLoopDelay() {
    _loopDelayActive = true;
    videoPlayer.pause();
    var remaining = Math.ceil(loopDelay);
    loopPlayBtn.textContent = 'Break: ' + remaining + 's';
    _loopDelayCountdown = setInterval(function() {
        remaining--;
        if (remaining <= 0) {
            clearInterval(_loopDelayCountdown);
            _loopDelayCountdown = null;
        } else {
            loopPlayBtn.textContent = 'Break: ' + remaining + 's';
        }
    }, 1000);
    _loopDelayTimer = setTimeout(function() {
        _loopDelayTimer = null;
        _loopDelayActive = false;
        if (!isLoopPlaying) { updateLoopPlayBtn(); return; }
        updateLoopPlayBtn();
        videoPlayer.currentTime = loopStartTime;
        videoPlayer.play();
    }, loopDelay * 1000);
}
