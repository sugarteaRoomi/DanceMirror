import os, sys, json, shutil, threading, signal, webbrowser, tempfile, time
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS

# Determine app directory (works both dev and PyInstaller bundled)
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

APP_DIR = os.path.join(BASE_DIR, 'app')
VIDEOS_DIR = os.path.join(os.path.expanduser('~'), 'DanceMirror', 'videos')
os.makedirs(VIDEOS_DIR, exist_ok=True)

app = Flask(__name__, static_folder=APP_DIR, static_url_path='')
CORS(app)

_jobs = {}
_last_ping = time.time()
_idle_timeout = 300  # 5 minutes

@app.route('/')
def index():
    return send_from_directory(APP_DIR, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    fp = os.path.join(APP_DIR, path)
    if os.path.exists(fp):
        return send_from_directory(APP_DIR, path)
    return send_from_directory(APP_DIR, 'index.html')

# --- YouTube ---
def _download(url):
    _jobs[url] = {'status': 'downloading', 'progress': 0, 'filename': None, 'error': None}
    try:
        ydl_opts = {
            'format': 'best[ext=mp4]/best',
            'outtmpl': os.path.join(VIDEOS_DIR, '%(title)s.%(ext)s'),
            'merge_output_format': 'mp4',
            'noplaylist': True,
            'progress_hooks': [lambda d: _on_progress(url, d)],
        }
        from yt_dlp import YoutubeDL
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            path = ydl.prepare_filename(info); path = os.path.splitext(path)[0] + '.mp4'
            _jobs[url] = {'status': 'done', 'progress': 100, 'filename': os.path.basename(path), 'error': None}
    except Exception as e:
        err = str(e)
        if 'sign in' in err.lower() or 'bot' in err.lower():
            for browser in ['chrome', 'firefox', 'brave', 'edge']:
                try:
                    ydl_opts['cookiesfrombrowser'] = (browser,)
                    from yt_dlp import YoutubeDL
                    with YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(url, download=True)
                        path = ydl.prepare_filename(info); path = os.path.splitext(path)[0] + '.mp4'
                        _jobs[url] = {'status': 'done', 'progress': 100, 'filename': os.path.basename(path), 'error': None}
                        return
                except Exception:
                    continue
            _jobs[url] = {'status': 'error', 'progress': 0, 'filename': None, 'error': 'YouTube blocked. Try closing Chrome first.'}
        else:
            _jobs[url] = {'status': 'error', 'progress': 0, 'filename': None, 'error': err}

def _on_progress(url, d):
    if d['status'] == 'downloading':
        try: pct = float(d.get('_percent_str', '0%').strip().replace('%', ''))
        except: pct = _jobs.get(url, {}).get('progress', 0)
        _jobs[url] = {'status': 'downloading', 'progress': pct, 'filename': None, 'error': None}

@app.route('/api/youtube', methods=['POST'])
def youtube_download():
    url = (request.json or {}).get('url', '').strip()
    if not url: return jsonify({'error': 'No URL provided'}), 400
    if url in _jobs and _jobs[url]['status'] == 'downloading': return jsonify(_jobs[url])
    threading.Thread(target=_download, args=(url,), daemon=True).start()
    return jsonify({'status': 'downloading', 'progress': 0})

@app.route('/api/youtube/progress')
def youtube_progress():
    return jsonify(_jobs.get(request.args.get('url', ''), {'status': 'unknown'}))

@app.route('/api/upload', methods=['POST'])
def upload_video():
    f = request.files.get('file')
    if not f or not f.filename: return jsonify({'error': 'No file'}), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ('.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'):
        return jsonify({'error': 'Unsupported format'}), 400
    path = os.path.join(VIDEOS_DIR, f.filename)
    f.save(path)
    return jsonify({'name': f.filename, 'size': os.path.getsize(path)})

@app.route('/api/videos')
def list_videos():
    files = []
    if os.path.isdir(VIDEOS_DIR):
        for f in sorted(os.listdir(VIDEOS_DIR)):
            if f.lower().endswith(('.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v')):
                p = os.path.join(VIDEOS_DIR, f); files.append({'name': f, 'size': os.path.getsize(p)})
    return jsonify(files)

@app.route('/api/video/<filename>', methods=['GET', 'DELETE'])
def serve_video(filename):
    path = os.path.join(VIDEOS_DIR, filename)
    if not os.path.exists(path): return jsonify({'error': 'Not found'}), 404
    if request.method == 'DELETE':
        os.remove(path); return jsonify({'deleted': filename})
    return send_file(path, mimetype='video/mp4')

@app.route('/api/ping')
def ping():
    global _last_ping
    _last_ping = time.time()
    return jsonify({'ok': True})

@app.route('/api/quit', methods=['POST'])
def quit_server():
    os.kill(os.getpid(), signal.SIGTERM)
    return jsonify({'status': 'shutting down'})

def _idle_check():
    while True:
        time.sleep(30)
        if time.time() - _last_ping > _idle_timeout:
            os.kill(os.getpid(), signal.SIGTERM)

if __name__ == '__main__':
    threading.Thread(target=_idle_check, daemon=True).start()
    webbrowser.open('http://127.0.0.1:5000')
    app.run(host='127.0.0.1', port=5000, debug=False)
