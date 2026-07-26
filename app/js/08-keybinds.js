// ============================================================
// Keyboard Shortcuts
// ============================================================
document.addEventListener('keydown', function(e) {
    if (e.target.matches('input[type="text"], textarea, select, [contenteditable="true"]')) return;

    var key = e.key;
    // 0 always jumps to start of video
    if (key === '0') {
        e.preventDefault();
        e.stopPropagation();
        jumpToMarker('0');
        return;
    }
    // Check if this key has a marker bound (takes priority over shortcuts)
    if (key in markers) {
        e.preventDefault();
        e.stopPropagation();
        jumpToMarker(key);
        return;
    }

    switch(key.toLowerCase()) {
        case 'm': mirrorBtn.click(); break;
        case 'arrowleft': {
            if (isCompareMode && videoBLoaded) { var sv = getSyncVideo(); syncSeek(Math.max(0, sv.currentTime - 3)); }
            else { var av = getActiveVideo(); seekToTime(Math.max(0, av.currentTime - 3)); }
            e.preventDefault(); break;
        }
        case 'arrowright': {
            if (isCompareMode && videoBLoaded) { var sv2 = getSyncVideo(); syncSeek(Math.min(sv2.duration || Infinity, sv2.currentTime + 3)); }
            else { var av2 = getActiveVideo(); seekToTime(Math.min(av2.duration || Infinity, av2.currentTime + 3)); }
            e.preventDefault(); break;
        }
        case 'arrowup': setSpeed(currentSpeed + 0.05); e.preventDefault(); break;
        case 'arrowdown': setSpeed(currentSpeed - 0.05); e.preventDefault(); break;
        case 'r': setSpeed(1.0); break;
        case ' ':
            e.preventDefault();
            if (isCompareMode && videoBLoaded) { syncPlayPause(); }
            else { var sp = getActiveVideo(); if (sp.paused) sp.play(); else sp.pause(); }
            break;
        case 's': jumpToSyncStart(); e.preventDefault(); e.stopPropagation(); break;
        case ',': loopStartBtn.click(); break;
        case '.': loopEndBtn.click(); break;
        case '/': loopPlayBtn.click(); break;
        case 'f': fullscreenBtn.click(); break;
    }
}, true);
