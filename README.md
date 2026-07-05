# Dance Mirror

Dance practice tool — mirror video, compare two videos side-by-side with audio sync, download YouTube videos in 4K.

## Quick Start

- **Mac:** Double-click `Dance Mirror.app`
- **Windows:** Double-click `Start.vbs`
- Or run `start.sh` / `start.bat`

## Install (one-time)

- **Windows:** Run `Install.bat` — copies to Programs, creates desktop shortcut

## Build .dmg / .exe

On your own machine:

```bash
pip install -r server/requirements-dev.txt
pyinstaller build.spec
```

- Mac: find `DanceMirror.app` in `dist/` — drag to Applications
- Windows: find `DanceMirror.exe` in `dist/` — run anywhere

To create a .dmg on Mac:
```bash
hdiutil create -volname "Dance Mirror" -srcfolder dist/DanceMirror.app -ov DanceMirror.dmg
```
