# PyInstaller spec — builds standalone .app (Mac) or .exe (Windows)
# Run: pip install pyinstaller && pyinstaller build.spec

import sys, os
from pathlib import Path

app_dir = Path('app')
datas = [(str(app_dir), 'app')]

a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=['flask', 'flask_cors', 'yt_dlp'],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='DanceMirror',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlement_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='DanceMirror',
)

if sys.platform == 'darwin':
    app = BUNDLE(
        coll,
        name='DanceMirror.app',
        icon=None,
        bundle_identifier='com.dancemirror.app',
        info_plist={
            'CFBundleName': 'Dance Mirror',
            'CFBundleShortVersionString': '1.0.0',
            'NSHighResolutionCapable': True,
        },
    )
