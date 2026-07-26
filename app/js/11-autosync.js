async function autoSync(vA, vB) {
    var durA = vA.duration || 0;
    var durB = vB.duration || 0;
    if (durA < 5 || durB < 5) return null;

    // Use blob if available, otherwise fetch from API
    var srcA = currentVideoBlob || '/api/video/' + encodeURIComponent(currentVideo ? currentVideo.name : '');
    var srcB = videoBBlob || '/api/video/' + encodeURIComponent(currentVideoB || '');

    syncStatus.textContent = 'Reading audio...';
    var roughA = await extractWaveform(srcA, durA, 200, 5);
    var roughB = await extractWaveform(srcB, durB, 200, 5);
    if (!roughA || !roughB) throw new Error('Could not extract audio.');

    // Trim leading silence
    var onsetA = trimLeadingSilence(roughA);
    var onsetB = trimLeadingSilence(roughB);

    syncStatus.textContent = 'Finding rough alignment...';
    var roughOffset = crossCorrelate(roughA, roughB);
    if (roughOffset === null) return null;

    syncStatus.textContent = 'Fine-tuning...';
    var fineA = await extractWaveform(srcA, durA, 1000, 2);
    var fineB = await extractWaveform(srcB, durB, 1000, 2);
    if (!fineA || !fineB) return null;

    // Trim fine envelopes at the same onset times (in seconds, converter handles rate)
    trimLeadingSilenceAt(fineA, onsetA);
    trimLeadingSilenceAt(fineB, onsetB);

    // Both rough and fine work on trimmed signals; only final result needs onset correction
    var onsetCorrection = onsetB - onsetA;
    return fineTune(fineA, fineB, roughOffset) + onsetCorrection;
}

function trimLeadingSilence(env) {
    var max = 0;
    for (var i = 0; i < env.data.length; i++) {
        if (env.data[i] > max) max = env.data[i];
    }
    var cutoff = max * 0.08;
    var onset = 0;
    for (var i = 0; i < env.data.length; i++) {
        if (env.data[i] >= cutoff) { onset = Math.max(0, i - 1); break; }
    }
    if (onset > 0) env.data = env.data.subarray(onset);
    return onset / env.sampleRate;
}

function trimLeadingSilenceAt(env, onsetSec) {
    var onsetIdx = Math.floor(onsetSec * env.sampleRate);
    if (onsetIdx > 0 && onsetIdx < env.data.length) {
        env.data = env.data.subarray(onsetIdx);
    }
}

async function extractWaveform(blob, maxDur, targetRate, envelopeMs) {
    if (!blob) return null;

    var arrayBuffer;
    if (typeof blob === 'string') {
        // Fetch from URL (API-loaded video)
        var resp = await fetch(blob);
        if (!resp.ok) return null;
        arrayBuffer = await resp.arrayBuffer();
    } else {
        arrayBuffer = await new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function() { resolve(reader.result); };
            reader.onerror = function() { reject(new Error('Failed to read video data')); };
            reader.readAsArrayBuffer(blob);
        });
    }

    var audioCtx = new AudioContext();
    var audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    audioCtx.close();

    var raw = audioBuffer.getChannelData(0);
    var origRate = audioBuffer.sampleRate;
    var actualDur = Math.min(maxDur, raw.length / origRate);
    var maxIdx = Math.floor(actualDur * origRate);
    var len, samples;

    if (envelopeMs) {
        var windowLen = Math.floor(origRate * envelopeMs / 1000);
        var hopLen = Math.floor(origRate / targetRate);
        len = Math.floor(maxIdx / hopLen);
        samples = new Float32Array(len);
        for (var i = 0; i < len; i++) {
            var center = i * hopLen;
            var start = Math.max(0, center - Math.floor(windowLen / 2));
            var end = Math.min(raw.length, start + windowLen);
            var sumSq = 0;
            for (var j = start; j < end; j++) sumSq += raw[j] * raw[j];
            samples[i] = Math.sqrt(sumSq / (end - start));
        }
    } else {
        var step = Math.max(1, Math.floor(origRate / targetRate));
        len = Math.floor(actualDur * targetRate);
        samples = new Float32Array(len);
        for (var i = 0; i < len; i++) {
            var srcIdx = Math.floor(i * step);
            samples[i] = raw[Math.min(srcIdx, raw.length - 1)];
        }
    }

    // Subtract mean so signal is zero-mean (improves correlation quality)
    var sum = 0;
    for (var i = 0; i < samples.length; i++) sum += samples[i];
    var mean = sum / samples.length;
    for (var i = 0; i < samples.length; i++) samples[i] -= mean;

    var maxAbs = 0;
    for (var i = 0; i < samples.length; i++) {
        var abs = Math.abs(samples[i]);
        if (abs > maxAbs) maxAbs = abs;
    }
    if (maxAbs > 0) {
        for (var i = 0; i < samples.length; i++) samples[i] /= maxAbs;
    }

    return { data: samples, sampleRate: targetRate };
}

function crossCorrelate(a, b) {
    // Slide B across the FULL overlap range so we can find the match
    // even when one file is much longer than the other
    var aLen = a.data.length;
    var bLen = b.data.length;

    // Search from B shifted all the way left (B's end at A's start)
    // to B shifted all the way right (B's start at A's end)
    var bestCorr = -Infinity;
    var bestShift = 0;

    for (var shift = -(bLen - 1); shift < aLen; shift++) {
        // Only iterate over the actual overlap
        var iStart = Math.max(0, shift);
        var iEnd = Math.min(aLen, bLen + shift);
        if (iEnd - iStart < 100) continue;

        var sum = 0;
        for (var i = iStart; i < iEnd; i++) {
            sum += a.data[i] * b.data[i - shift];
        }
        var corr = sum / Math.sqrt(iEnd - iStart);
        if (corr > bestCorr) {
            bestCorr = corr;
            bestShift = shift;
        }
    }

    return -bestShift / a.sampleRate;
}

function fineTune(a, b, roughOffset) {
    // Search ±1.5s around the rough offset at the higher sample rate
    var aLen = a.data.length;
    var bLen = b.data.length;
    var roughShift = Math.round(-roughOffset * a.sampleRate);
    var searchRadius = Math.floor(1.5 * a.sampleRate);

    var bestShift = roughShift;
    var bestCorr = -Infinity;

    for (var shift = roughShift - searchRadius; shift <= roughShift + searchRadius; shift++) {
        var iStart = Math.max(0, shift);
        var iEnd = Math.min(aLen, bLen + shift);
        if (iEnd - iStart < 100) continue;

        var sum = 0;
        for (var i = iStart; i < iEnd; i++) {
            sum += a.data[i] * b.data[i - shift];
        }
        var corr = sum / Math.sqrt(iEnd - iStart);
        if (corr > bestCorr) {
            bestCorr = corr;
            bestShift = shift;
        }
    }

    // Sub-sample parabolic interpolation around the peak
    function corrAt(shift) {
        var iStart = Math.max(0, shift);
        var iEnd = Math.min(aLen, bLen + shift);
        if (iEnd - iStart < 100) return -Infinity;
        var sum = 0;
        for (var i = iStart; i < iEnd; i++) {
            sum += a.data[i] * b.data[i - shift];
        }
        return sum / Math.sqrt(iEnd - iStart);
    }
    var cPrev = corrAt(bestShift - 1);
    var cNext = corrAt(bestShift + 1);
    var denom = 2 * (cPrev - 2 * bestCorr + cNext);
    var fracShift = bestShift;
    if (denom !== 0 && isFinite(denom)) {
        var delta = (cPrev - cNext) / denom;
        fracShift = bestShift + delta;
    }

    return -fracShift / a.sampleRate;
}
