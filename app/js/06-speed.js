// ============================================================
// Speed
// ============================================================
function setSpeed(speed) {
    currentSpeed = Math.max(0.25, Math.min(2.0, speed));
    currentSpeed = Math.round(currentSpeed * 100) / 100;
    videoPlayer.playbackRate = currentSpeed;
    cutVideo.playbackRate = currentSpeed;
    if (videoBLoaded) videoPlayerB.playbackRate = currentSpeed;
    speedInput.value = currentSpeed.toFixed(2) + 'x';
    if (currentSpeed === 1.0) {
        speedInput.classList.remove('not-default');
    } else {
        speedInput.classList.add('not-default');
    }
}

speedDownBtn.addEventListener('click', function() { setSpeed(currentSpeed - 0.05); });
speedUpBtn.addEventListener('click', function() { setSpeed(currentSpeed + 0.05); });
speedResetBtn.addEventListener('click', function() { setSpeed(1.0); });

speedInput.addEventListener('focus', function() {
    if (this.value.endsWith('x')) this.value = this.value.slice(0, -1);
    this.select();
});
speedInput.addEventListener('blur', function() {
    this.value = currentSpeed.toFixed(2) + 'x';
});
speedInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        var val = parseFloat(this.value);
        if (!isNaN(val)) setSpeed(val);
        this.blur();
    }
});
