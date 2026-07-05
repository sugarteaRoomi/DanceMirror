import os, sys, json, shutil, threading, time
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(os.path.dirname(BASE_DIR), 'app')
VIDEOS_DIR = os.path.join(os.path.dirname(BASE_DIR), 'videos')
os.makedirs(VIDEOS_DIR, exist_ok=True)

app = Flask(__name__, static_folder=APP_DIR, static_url_path='')
CORS(app)

_jobs = {}

@app.route('/')
def index():
    return send_from_directory(APP_DIR, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    if os.path.exists(os.path.join(APP_DIR, path)):
        return send_from_directory(APP_DIR, path)
    return send_from_directory(APP_DIR, 'index.html')

# --- YouTube ---
def _download(url):
    _jobs[url] = {'status': 'downloading', 'progress': 0, 'filename': None, 'error': None}

    def _try_dl(extra_opts=None):
        opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': os.path.join(VIDEOS_DIR, '%(title)s.%(ext)s'),
            'merge_output_format': 'mp4',
            'noplaylist': True,
            'progress_hooks': [lambda d: _on_progress(url, d)],
        }
        if extra_opts:
            opts.update(extra_opts)
        from yt_dlp import YoutubeDL
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            path = ydl.prepare_filename(info)
            path = os.path.splitext(path)[0] + '.mp4'
            filename = os.path.basename(path)
            _jobs[url] = {'status': 'done', 'progress': 100, 'filename': filename, 'error': None}
            return True
        return False

    try:
        # Try without cookies first — works on home IPs for most videos
        _try_dl()
        return
    except Exception as e:
        err = str(e).lower()
        if 'sign in' not in err and 'bot' not in err:
            _jobs[url] = {'status': 'error', 'progress': 0, 'filename': None, 'error': str(e)}
            return

    # Bot detected — try browser cookies
    for browser in ['chrome', 'firefox', 'brave', 'edge', 'opera']:
        try:
            _try_dl({'cookiesfrombrowser': (browser,)})
            return
        except Exception:
            continue

    _jobs[url] = {'status': 'error', 'progress': 0, 'filename': None, 'error': 'YouTube blocked the request. Try closing Chrome first, or export cookies manually.'}

def _on_progress(url, d):
    if d['status'] == 'downloading':
        pct_str = d.get('_percent_str', '0%').strip().replace('%', '')
        try:
            pct = float(pct_str)
        except ValueError:
            pct = _jobs.get(url, {}).get('progress', 0)
        _jobs[url] = {'status': 'downloading', 'progress': pct, 'filename': None, 'error': None}

@app.route('/api/youtube', methods=['POST'])
def youtube_download():
    data = request.json or {}
    url = data.get('url', '').strip()
    if not url:
        return jsonify({'error': 'No URL provided'}), 400
    if url in _jobs and _jobs[url]['status'] == 'downloading':
        return jsonify(_jobs[url])
    threading.Thread(target=_download, args=(url,), daemon=True).start()
    return jsonify({'status': 'downloading', 'progress': 0})

@app.route('/api/youtube/progress')
def youtube_progress():
    url = request.args.get('url', '')
    return jsonify(_jobs.get(url, {'status': 'unknown'}))

# --- Upload ---
@app.route('/api/upload', methods=['POST'])
def upload_video():
    f = request.files.get('file')
    if not f or not f.filename:
        return jsonify({'error': 'No file provided'}), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ('.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'):
        return jsonify({'error': 'Unsupported format'}), 400
    path = os.path.join(VIDEOS_DIR, f.filename)
    f.save(path)
    return jsonify({'name': f.filename, 'size': os.path.getsize(path)})

# --- Library ---
@app.route('/api/videos')
def list_videos():
    files = []
    if os.path.isdir(VIDEOS_DIR):
        for f in sorted(os.listdir(VIDEOS_DIR)):
            if f.lower().endswith(('.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v')):
                path = os.path.join(VIDEOS_DIR, f)
                files.append({'name': f, 'size': os.path.getsize(path)})
    return jsonify(files)

@app.route('/api/video/<filename>', methods=['GET', 'DELETE'])
def serve_video(filename):
    path = os.path.join(VIDEOS_DIR, filename)
    if not os.path.exists(path):
        return jsonify({'error': 'Not found'}), 404
    if request.method == 'DELETE':
        os.remove(path)
        return jsonify({'deleted': filename})
    return send_file(path, mimetype='video/mp4')

@app.route('/api/quit', methods=['POST'])
def quit_server():
    import signal
    os.kill(os.getpid(), signal.SIGTERM)
    return jsonify({'status': 'shutting down'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='127.0.0.1', port=port, debug=False)
