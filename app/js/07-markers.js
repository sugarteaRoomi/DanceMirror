// ============================================================
// Keybinds
// ============================================================
function saveMarkers() {
    if (!currentVideo) return;
    try {
        localStorage.setItem('mirror-markers-' + currentVideo.name, JSON.stringify(markers));
    } catch(e) {}
}

function keyDisplayName(key) {
    if (key === ' ') return 'Space';
    return key;
}

function renderKeybinds() {
    keybindList.innerHTML = '';

    // Permanent 0 keybind — always jumps to start
    var zeroRow = document.createElement('div');
    zeroRow.className = 'keybind-row';
    zeroRow.setAttribute('data-marker-key', '0');
    zeroRow.title = 'Press "0" to jump to start of video';
    zeroRow.innerHTML =
        '<span class="keybind-badge">0</span>' +
        '<span class="keybind-time">0:00</span>';
    keybindList.appendChild(zeroRow);

    var entries = Object.keys(markers);
    if (entries.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'keybind-empty';
        empty.style.marginTop = '8px';
        empty.textContent = 'No keybinds set. Click "+ Add", then press 1-9 to save the current timestamp.';
        keybindList.appendChild(empty);
        return;
    }
    entries.sort();
    entries.forEach(function(key) {
        var row = document.createElement('div');
        row.className = 'keybind-row';
        row.setAttribute('data-marker-key', key);
        row.title = 'Press "' + keyDisplayName(key) + '" to jump to ' + formatTime(markers[key]);
        row.innerHTML =
            '<span class="keybind-badge">' + escapeHTML(keyDisplayName(key)) + '</span>' +
            '<span class="keybind-time">' + formatTime(markers[key]) + '</span>' +
            '<button class="keybind-clear" data-marker-key="' + escapeHTML(key) + '" title="Remove">&times;</button>';
        keybindList.appendChild(row);
    });
}

keybindList.addEventListener('click', function(e) {
    var clearBtn = e.target.closest('.keybind-clear');
    if (clearBtn) {
        e.stopPropagation();
        var key = clearBtn.getAttribute('data-marker-key');
        if (key) {
            delete markers[key];
            saveMarkers();
            renderKeybinds();
        }
        return;
    }
    var row = e.target.closest('.keybind-row');
    if (!row) return;
    var key = row.getAttribute('data-marker-key');
    if (key) jumpToMarker(key);
});

resetMarkersBtn.addEventListener('click', function() {
    if (!currentVideo) return;
    markers = {};
    try { localStorage.removeItem('mirror-markers-' + currentVideo.name); } catch(e) {}
    renderKeybinds();
});

resetLoopBtn.addEventListener('click', function() {
    if (!currentVideo) return;
    loopStartTime = null;
    loopEndTime = null;
    isLoopPlaying = false;
    try { localStorage.removeItem('mirror-loop-' + currentVideo.name); } catch(e) {}
    updateLoopDisplay();
    updateLoopPlayBtn();
});

resetCutBtn.addEventListener('click', function() {
    if (!currentVideo) return;
    cutStartTime = null;
    cutEndTime = null;
    isCutActive = false;
    if (isOnCutVideo) switchToMain(cutVideo.currentTime);
    try { localStorage.removeItem('mirror-cut-' + currentVideo.name); } catch(e) {}
    updateCutDisplay();
    updateCutPlayBtn();
    updateLoopDisplay();
});

addKeybindBtn.addEventListener('click', function() {
    addKeybindBtn.style.display = 'none';
    keybindInputNum.style.display = '';
    cancelKeybindBtn.style.display = '';
    keybindInputNum.value = '';
    keybindInputNum.placeholder = 'press a key';
    keybindInputNum.focus();
});

cancelKeybindBtn.addEventListener('click', hideKeybindInput);

function hideKeybindInput() {
    addKeybindBtn.style.display = '';
    keybindInputNum.style.display = 'none';
    cancelKeybindBtn.style.display = 'none';
}

keybindInputNum.addEventListener('keydown', function(e) {
    e.preventDefault();
    if (e.key === 'Escape') {
        hideKeybindInput();
        return;
    }
    // Only allow digits 1-9
    if (!/^[1-9]$/.test(e.key)) return;

    var av = getActiveVideo();
    if (av && !isNaN(av.currentTime)) {
        markers[e.key] = av.currentTime;
        saveMarkers();
        renderKeybinds();
    }
    hideKeybindInput();
});

function jumpToSyncStart() {
    if (getActiveVideo().readyState < 1) return;
    var targetTime = syncOffset < 0 ? -syncOffset : 0;
    if (isCompareMode && videoBLoaded) { syncSeek(targetTime); }
    else { seekToTime(targetTime); }
}

function jumpToMarker(key) {
    if (getActiveVideo().readyState < 1) return;
    var targetTime;
    if (key === '0') {
        targetTime = 0;
    } else if (key === 's' && isCompareMode && videoBLoaded) {
        jumpToSyncStart();
        return;
    } else if (markers[key] != null) {
        targetTime = markers[key];
    } else {
        return;
    }
    if (isCompareMode && videoBLoaded) { syncSeek(targetTime); }
    else { seekToTime(targetTime); }

    var row = keybindList.querySelector('.keybind-row[data-marker-key="' + CSS.escape(key) + '"]');
    if (row) {
        row.style.background = 'rgba(196, 77, 255, 0.25)';
        setTimeout(function() { row.style.background = ''; }, 300);
    }
}
