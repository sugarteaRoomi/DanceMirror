// ============================================================
// Video Controls
// ============================================================
function formatTime(seconds) {
    if (seconds == null || isNaN(seconds)) return '0:00';
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
}
function formatTimePrecise(seconds) {
    if (seconds == null || isNaN(seconds)) return '0:00.00';
    var m = Math.floor(seconds / 60);
    var s = (seconds % 60).toFixed(2);
    return m + ':' + (parseFloat(s) < 10 ? '0' : '') + s;
}

function getActiveVideo() {
    return isOnCutVideo ? cutVideo : videoPlayer;
}

function updateTimeDisplay() {
    var v = getActiveVideo();
    var cur = v.currentTime || 0;
    var dur = v.duration || 0;
    timeDisplay.textContent = formatTime(cur);
    if (isNaN(dur) || !isFinite(dur)) {
        durationDisplay.textContent = '0:00';
        seekInput.max = 1000;
        seekInput.value = 0;
        seekProgress.style.width = '0%';
    } else {
        durationDisplay.textContent = formatTime(dur);
        var pct = dur > 0 ? (cur / dur) * 1000 : 0;
        seekInput.max = 1000;
        seekInput.value = Math.round(pct);
        seekProgress.style.width = (pct / 10) + '%';
    }
    if (v.buffered && v.buffered.length > 0) {
        var bufEnd = v.buffered.end(v.buffered.length - 1);
        var bufPct = dur > 0 ? (bufEnd / dur) * 100 : 0;
        seekBuffered.style.width = bufPct + '%';
    }
}

function updatePlayPauseBtn() {
    playPauseBtn.innerHTML = getActiveVideo().paused ? '&#9654;' : '&#10074;&#10074;';
}

videoPlayer.addEventListener('timeupdate', updateTimeDisplay);
videoPlayer.addEventListener('loadedmetadata', updateTimeDisplay);
videoPlayer.addEventListener('play', updatePlayPauseBtn);
videoPlayer.addEventListener('pause', updatePlayPauseBtn);
videoPlayer.addEventListener('loadedmetadata', updatePlayPauseBtn);
videoPlayer.addEventListener('loadedmetadata', function() { if (isCompareMode && videoBLoaded) updateOffsetSliderRange(); });
cutVideo.addEventListener('timeupdate', updateTimeDisplay);
cutVideo.addEventListener('loadedmetadata', updateTimeDisplay);
cutVideo.addEventListener('play', updatePlayPauseBtn);
cutVideo.addEventListener('pause', updatePlayPauseBtn);
cutVideo.addEventListener('loadedmetadata', updatePlayPauseBtn);

playPauseBtn.addEventListener('click', function() {
    if (isCompareMode && videoBLoaded) { syncPlayPause(); return; }
    var v = getActiveVideo();
    if (v.paused) v.play(); else v.pause();
});

// Single entry point for all manual seeks — handles cut zone correctly
function seekToTime(targetTime) {
    if (isCutActive && cutStartTime !== null && cutEndTime !== null) {
        if (targetTime >= cutStartTime && targetTime < cutEndTime) {
            targetTime = cutEndTime;
        }
        if (isOnCutVideo && targetTime < cutStartTime) {
            switchToMain(targetTime);
            cutPrepped = false;
            return;
        }
    }
    if (isOnCutVideo) {
        switchToMain(targetTime);
    } else {
        getActiveVideo().currentTime = targetTime;
    }
    cutPrepped = false;
}

// cutVideo seeked — executes the seamless switch once seek completes
cutVideo.addEventListener('seeked', function() {
    if (!cutPrepped || isOnCutVideo || !isCutActive) return;
    if (cutStartTime === null || cutEndTime === null) return;
    var ct = videoPlayer.currentTime;
    if (ct >= cutStartTime && ct < cutEndTime) {
        switchToCut();
    }
});

function seekToPct(pct) {
    var dur = getActiveVideo().duration || 0;
    if (dur > 0) {
        seekToTime(pct * dur);
        seekInput.value = Math.round(pct * 1000);
        seekProgress.style.width = (pct * 100) + '%';
    }
}

seekBar.addEventListener('click', function(e) {
    if (isCompareMode && videoBLoaded) {
        var dur = videoPlayer.duration || 0;
        if (!dur) return;
        var rect = seekBar.getBoundingClientRect();
        var pct = (e.clientX - rect.left) / rect.width;
        pct = Math.max(0, Math.min(1, pct));
        syncSeek(pct * dur);
        return;
    }
    var v = getActiveVideo();
    var dur = v.duration || 0;
    if (!dur) return;
    var rect = seekBar.getBoundingClientRect();
    var pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    seekToPct(pct);
});

seekInput.addEventListener('input', function() {
    if (isCompareMode && videoBLoaded) {
        var dur = videoPlayer.duration || 0;
        if (dur > 0) syncSeek((parseInt(seekInput.value, 10) / 1000) * dur);
        return;
    }
    seekToPct(parseInt(seekInput.value, 10) / 1000);
});

seekBar.addEventListener('mousemove', function(e) {
    var dur = videoPlayer.duration || 0;
    if (!dur) return;
    var rect = seekBar.getBoundingClientRect();
    var pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    seekTooltip.textContent = formatTime(pct * dur);
    seekTooltip.style.left = (pct * 100) + '%';
    seekTooltip.classList.add('visible');
});

seekBar.addEventListener('mouseleave', function() {
    seekTooltip.classList.remove('visible');
});

videoPlayer.addEventListener('dblclick', function(e) {
    e.preventDefault();
    fullscreenBtn.click();
});

fullscreenBtn.addEventListener('click', function() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else if (isCompareMode && videoBLoaded) {
        var ps = document.getElementById('playerSection');
        // Hide non-video children
        Array.from(ps.children).forEach(function(c) {
            if (c !== fsContainer && c !== document.getElementById('videoBArea')) {
                c._fsDisp = c.style.display;
                c.style.display = 'none';
            }
        });
        // Set up both halves with inline styles
        fsContainer._fsCS = fsContainer.style.cssText;
        fsContainer.style.cssText = 'display:flex;align-items:center;justify-content:center;flex:1;height:100%;background:#000;border-radius:0;overflow:hidden;margin:0;padding:0';
        var ba = document.getElementById('videoBArea');
        ba._fsCS = ba.style.cssText;
        ba.style.cssText = 'display:block;flex:1;height:100%;background:#000;margin:0;padding:0';
        ba.querySelector('h2').style.display = 'none';
        var cb = document.getElementById('fsContainerB');
        cb._fsCS = cb.style.cssText;
        cb.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000;border-radius:0;overflow:hidden';
        // Request fullscreen
        ps.requestFullscreen ? ps.requestFullscreen() : ps.webkitRequestFullscreen();
    } else {
        (fsContainer.requestFullscreen || fsContainer.webkitRequestFullscreen || fsContainer.msRequestFullscreen).call(fsContainer);
    }
});

var hideControlsTimer;
function showOverlayControls() {
    videoOverlay.classList.remove('hidden');
    fsContainer.classList.remove('cursor-hidden');
    clearTimeout(hideControlsTimer);
    if (document.fullscreenElement) {
        hideControlsTimer = setTimeout(function() {
            videoOverlay.classList.add('hidden');
            fsContainer.classList.add('cursor-hidden');
        }, 2500);
    }
}
fsContainer.addEventListener('mousemove', showOverlayControls);

document.addEventListener('fullscreenchange', function() {
    if (document.fullscreenElement) {
        fullscreenBtn.innerHTML = '&#128473;';
        showOverlayControls();
    } else {
        fullscreenBtn.innerHTML = '&#9974;';
        videoOverlay.classList.remove('hidden');
        fsContainer.classList.remove('cursor-hidden');
        clearTimeout(hideControlsTimer);
        // Restore compare fullscreen styles
        var ps = document.getElementById('playerSection');
        if (ps) {
            Array.from(ps.children).forEach(function(c) { if (c._fsDisp !== undefined) { c.style.display = c._fsDisp; delete c._fsDisp; } });
        }
        if (fsContainer._fsCS !== undefined) { fsContainer.style.cssText = fsContainer._fsCS; delete fsContainer._fsCS; }
        var ba = document.getElementById('videoBArea');
        if (ba) {
            if (ba._fsCS !== undefined) { ba.style.cssText = ba._fsCS; delete ba._fsCS; }
            var h2 = ba.querySelector('h2'); if (h2) h2.style.display = '';
        }
        var cb = document.getElementById('fsContainerB');
        if (cb && cb._fsCS !== undefined) { cb.style.cssText = cb._fsCS; delete cb._fsCS; }
    }
});

// Click-to-pause on video area. Skip if zoom-panning moved the view.
var _panMoved = false;
function _onVideoClick(e) {
    if (_panMoved) { _panMoved = false; return; }
    if (isCompareMode && videoBLoaded) { syncPlayPause(); return; }
    var v = getActiveVideo();
    if (v.paused) v.play(); else v.pause();
}
videoPlayer.addEventListener('click', _onVideoClick);
cutVideo.addEventListener('click', _onVideoClick);

// Fullscreen zoom and pan
var zoomScale = 1;
var zoomPanX = 0, zoomPanY = 0;
var isPanning = false, panStartX, panStartY, panOrigX, panOrigY;

function applyZoomTransform() {
    if (zoomScale === 1) {
        videoWrap.style.transform = '';
    } else {
        videoWrap.style.transform = 'translate(' + zoomPanX + 'px, ' + zoomPanY + 'px) scale(' + zoomScale + ')';
    }
}

// Returns the video wrap and container for the current zoom target
function _zoomTarget() {
    if (!document.fullscreenElement) return null;
    var el = document.fullscreenElement;
    // In compare mode, fullscreen is on playerSection, find which child the cursor is over
    if (el === document.getElementById('playerSection')) {
        var b = document.getElementById('fsContainerB');
        if (b && b.matches(':hover')) return { wrap: videoWrapB, container: b, mirror: isMirroredB };
    }
    return { wrap: videoWrap, container: fsContainer, mirror: isMirrored };
}

function applyZoomTransform(t) {
    t = t || _zoomTarget();
    if (!t) return;
    if (zoomScale === 1) {
        t.wrap.style.transform = '';
    } else {
        t.wrap.style.transform = 'translate(' + zoomPanX + 'px, ' + zoomPanY + 'px) scale(' + zoomScale + ')';
    }
}

function resetZoom(t) {
    t = t || _zoomTarget();
    zoomScale = 1;
    zoomPanX = 0;
    zoomPanY = 0;
    if (t) { t.wrap.style.transform = ''; t.wrap.style.cursor = ''; }
}

var _activeZoomTarget = null;
function _onWheelZoom(e) {
    if (!document.fullscreenElement) return;
    e.preventDefault();
    var t = _zoomTarget();
    if (!t) return;
    _activeZoomTarget = t;
    var rect = t.container.getBoundingClientRect();
    var mx = e.clientX - rect.left - rect.width / 2;
    var my = e.clientY - rect.top - rect.height / 2;

    var oldScale = zoomScale;
    zoomScale += e.deltaY < 0 ? 0.25 : -0.25;
    zoomScale = Math.max(1, Math.min(4, zoomScale));

    if (zoomScale > 1) {
        var scaleChange = zoomScale / oldScale;
        zoomPanX = mx + scaleChange * (zoomPanX - mx);
        zoomPanY = my + scaleChange * (zoomPanY - my);
        t.wrap.style.cursor = 'grab';
    } else {
        resetZoom(t);
    }
    applyZoomTransform(t);
}
fsContainer.addEventListener('wheel', _onWheelZoom, { passive: false });
document.getElementById('fsContainerB').addEventListener('wheel', _onWheelZoom, { passive: false });

function _onPanStart(e) {
    if (!document.fullscreenElement) return;
    var t = _zoomTarget();
    if (!t) return;
    if (zoomScale === 1) { zoomScale = 1.01; t.wrap.style.cursor = 'grab'; applyZoomTransform(t); }
    _activeZoomTarget = t;
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panOrigX = zoomPanX;
    panOrigY = zoomPanY;
    t.wrap.style.cursor = 'grabbing';
    e.preventDefault();
}
fsContainer.addEventListener('mousedown', _onPanStart);
document.getElementById('fsContainerB').addEventListener('mousedown', _onPanStart);

document.addEventListener('mousemove', function(e) {
    if (!isPanning) return;
    _panMoved = true;
    zoomPanX = panOrigX + (e.clientX - panStartX);
    zoomPanY = panOrigY + (e.clientY - panStartY);
    applyZoomTransform(_activeZoomTarget);
});

document.addEventListener('mouseup', function() {
    if (!isPanning) return;
    isPanning = false;
    if (_activeZoomTarget && zoomScale > 1) _activeZoomTarget.wrap.style.cursor = 'grab';
});

