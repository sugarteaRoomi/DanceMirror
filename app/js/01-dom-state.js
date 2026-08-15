// ============================================================
// DOM Refs
// ============================================================
const openArea = document.getElementById('openArea');
const videoList = document.getElementById('videoList');
const playerLayout = document.getElementById('playerLayout');
const fsContainer = document.getElementById('fsContainer');
const videoWrap = document.getElementById('videoWrap');
const videoPlayer = document.getElementById('videoPlayer');
const videoOverlay = document.getElementById('videoOverlay');
const playPauseBtn = document.getElementById('playPauseBtn');
const timeDisplay = document.getElementById('timeDisplay');
const durationDisplay = document.getElementById('durationDisplay');
const seekInput = document.getElementById('seekInput');
const seekProgress = document.getElementById('seekProgress');
const seekBuffered = document.getElementById('seekBuffered');
const seekTooltip = document.getElementById('seekTooltip');
const seekBar = document.getElementById('seekBar');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const mirrorBtn = document.getElementById('mirrorBtn');
const loopBtn = document.getElementById('loopBtn');
const speedDownBtn = document.getElementById('speedDownBtn');
const speedUpBtn = document.getElementById('speedUpBtn');
const speedResetBtn = document.getElementById('speedResetBtn');
const speedInput = document.getElementById('speedInput');
const videoInfo = document.getElementById('videoInfo');
const playerTitle = document.getElementById('playerTitle');
const keybindList = document.getElementById('keybindList');
const resetMarkersBtn = document.getElementById('resetMarkersBtn');
const resetLoopBtn = document.getElementById('resetLoopBtn');
const addKeybindBtn = document.getElementById('addKeybindBtn');
const keybindInputNum = document.getElementById('keybindInputNum');
const cancelKeybindBtn = document.getElementById('cancelKeybindBtn');
const loopStartBtn = document.getElementById('loopStartBtn');
const loopEndBtn = document.getElementById('loopEndBtn');
const loopPlayBtn = document.getElementById('loopPlayBtn');
const loopTimes = document.getElementById('loopTimes');
const loopEmpty = document.getElementById('loopEmpty');
const loopDelayInput = document.getElementById('loopDelayInput');

// ============================================================
// State
// ============================================================
let currentVideo = null;
let currentObjectURL = null;
let currentVideoBlob = null;
let videoBBlob = null;
let isMirrored = true;
let isMirroredB = false;
let isLooping = true;
let currentSpeed = 1.0;
let markers = {}; // key (string) → time (seconds)
let shouldScrollToPlayer = false; // scroll once after folder pick
let loopEndTime = null; // seconds
let isLoopPlaying = false;
let loopDelay = 0; // seconds of break between practice loop reps

// ============================================================
// Folder-based Video Library
// ============================================================
var VIDEO_EXTS = ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'];
var folderHandle = null;
var folderName = '';
var currentFiles = []; // for file-input fallback path
