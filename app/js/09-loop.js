// ============================================================
// Loop
// ============================================================
loopBtn.addEventListener('click', function() {
    isLooping = !isLooping;
    
    if (videoBLoaded) 
    if (isLooping) {
        this.innerHTML = '&#x1f501; Loop: On';
        this.classList.add('active');
    } else {
        this.innerHTML = '&#x1f501; Loop: Off';
        this.classList.remove('active');
    }
});
loopBtn.classList.add('active');

// Practice Loop
// ============================================================
// Practice Loop
// ============================================================
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
            start: loopStartTime, end: loopEndTime
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
    updateLoopPlayBtn();
    updateLoopDisplay();
    if (isLoopPlaying) {
        var v = getActiveVideo();
        var target = loopStartTime;
        if (v && v.currentTime < target) {
            v.currentTime = target;
        }
        startLoopRAF();
    }
});
