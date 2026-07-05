// ============================================================
// Mirror
// ============================================================
function updateMirrorBtn() {
    if (isMirrored) {
        mirrorBtn.classList.add('mirrored-active');
        mirrorBtn.innerHTML = '&#x1f504; Mirrored';
    } else {
        mirrorBtn.classList.remove('mirrored-active');
        mirrorBtn.innerHTML = '&#x1f504; Original';
    }
}
mirrorBtn.addEventListener('click', function() {
    isMirrored = !isMirrored;
    isMirroredB = !isMirroredB;
    if (isMirrored) { videoWrap.classList.add('mirrored'); }
    else { videoWrap.classList.remove('mirrored'); }
    if (isMirroredB) { videoWrapB.classList.add('mirrored'); mirrorBtnB.classList.add('mirrored-active'); }
    else { videoWrapB.classList.remove('mirrored'); mirrorBtnB.classList.remove('mirrored-active'); }
    updateMirrorBtn();
});

var mirrorBtnB = document.getElementById('mirrorBtnB');
mirrorBtnB.addEventListener('click', function() {
    isMirroredB = !isMirroredB;
    if (isMirroredB) { videoWrapB.classList.add('mirrored'); this.classList.add('mirrored-active'); }
    else { videoWrapB.classList.remove('mirrored'); this.classList.remove('mirrored-active'); }
});
updateMirrorBtn();

