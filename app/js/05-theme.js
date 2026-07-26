// ============================================================
// Color Theme — slowly drift through random hues
// ============================================================
(function() {
    var startHue = 270;
    var startTime = performance.now();
    var colorRAF = null;
    var CYCLE_MS = 30 * 60 * 1000; // exactly 30 minutes

    function drift(now) {
        var elapsed = now - startTime;
        var hue = (startHue - (elapsed / CYCLE_MS * 360) % 360 + 360) % 360;
        var h = Math.round(hue * 100) / 100;
        var root = document.documentElement.style;
        root.setProperty('--accent', 'hsl(' + h + ',80%,56%)');
        root.setProperty('--accent2', 'hsl(' + ((h + 35) % 360) + ',80%,56%)');
        root.setProperty('--gradient', 'linear-gradient(135deg, hsl(' + h + ',80%,56%), hsl(' + ((h + 35) % 360) + ',80%,56%))');
        colorRAF = requestAnimationFrame(drift);
    }

    requestAnimationFrame(drift);
})();
