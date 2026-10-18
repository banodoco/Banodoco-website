#!/usr/bin/env python3
"""Static server for glowshroom/ with caching DISABLED.

Replaces the plain http.server that served :8137 without cache headers —
Chrome caches ES modules aggressively, so every edit needed manual
cache-busting and reviewers kept seeing stale builds. no-store fixes it
for everyone. Run: python3 serve.py

Range requests are honoured (206 partial content): Safari's media loader
sends byte ranges for <video> and stalls mid-playback when the server
answers 200 with the whole body — that was the ADOS preview "freezing"
after a second (2026-08-18).
"""
import hashlib, hmac, http.server, json, os, posixpath, re, sys, urllib.parse
from http import cookies
from pathlib import Path

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# A checkout loads live source, including on LAN phones. Packaged artifacts
# have no tools directory and serve the production map. Tests can opt into it.
RUNTIME_MODE = os.environ.get('RUNTIME_MODE', 'source' if os.path.isdir('tools') else 'release')
if RUNTIME_MODE not in ('source', 'release'):
    raise ValueError('RUNTIME_MODE must be source or release')

PUBLIC_ORIGIN = os.environ.get('PUBLIC_ORIGIN', 'http://127.0.0.1:8137').rstrip('/')
DECK_ANGEL_KEYS = tuple(dict.fromkeys(
    value for value in os.environ.get('DECK_ANGEL_KEYS', '').split(',')
    if re.fullmatch(r'[A-Za-z0-9]{12,128}', value)
))
DECK_PUBLIC_FILES = frozenset({
    'gate.html', 'gate.js', 'mycelial-og.jpg',
})
DECK_PUBLIC_PREFIXES = ('fonts/deck/', 'brand/')
DECK_SUFFIXES = frozenset({
    '.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.avif', '.webp', '.gif',
    '.svg', '.ico', '.mp4', '.webm', '.mov', '.woff', '.woff2', '.ttf', '.otf', '.eot',
    '.bin', '.webmanifest', '.xml', '.txt',
})
DECK_COOKIE_MESSAGE = b'banodoco-deck-angel/v1'


def valid_deck_key(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9]{12,128}', value):
        return None
    return next((key for key in DECK_ANGEL_KEYS if hmac.compare_digest(value, key)), None)


def deck_cookie_valid(value):
    if not value:
        return False
    return any(hmac.compare_digest(
        value, hmac.new(key.encode(), DECK_COOKIE_MESSAGE, hashlib.sha256).hexdigest()
    ) for key in DECK_ANGEL_KEYS)


def deck_cookie_value(key):
    return hmac.new(key.encode(), DECK_COOKIE_MESSAGE, hashlib.sha256).hexdigest()

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def request_path(self):
        raw = urllib.parse.urlsplit(self.path).path
        decoded = urllib.parse.unquote(raw)
        if '\x00' in decoded or '\\' in decoded:
            return None
        trailing_slash = decoded.endswith('/')
        normalized = posixpath.normpath(decoded)
        if not normalized.startswith('/'):
            normalized = '/' + normalized
        # normpath preserves a double leading slash; HTTP paths have one root.
        normalized = '/' + '/'.join(part for part in normalized.split('/') if part)
        if trailing_slash and normalized != '/':
            normalized += '/'
        return normalized

    def refuses_release_mycelial_target(self, target):
        if RUNTIME_MODE != 'release':
            return False
        mycelial = Path(os.getcwd(), 'mycelial').resolve()
        for ancestor in (Path(target), *Path(target).parents):
            try:
                if os.path.samefile(ancestor, mycelial):
                    return True
            except (FileNotFoundError, OSError):
                pass
        try:
            Path(target).resolve().relative_to(mycelial)
            return True
        except ValueError:
            return False

    def safe_file(self, relative):
        """Resolve a public relative path without dotfiles, traversal or symlinks."""
        decoded = urllib.parse.unquote(relative)
        parts = Path(decoded).parts
        if not parts or any(part in ('', '.', '..') or part.startswith('.') or '\\' in part for part in parts):
            return None
        target = Path(os.getcwd(), *parts)
        root = Path(os.getcwd()).resolve()
        try:
            resolved = target.resolve()
            resolved.relative_to(root)
        except ValueError:
            return None
        current = root
        for part in parts:
            current = current / part
            if current.is_symlink():
                return None
        if not target.is_file() or target.suffix.lower() not in DECK_SUFFIXES:
            return None
        return target

    def deck_unlocked(self):
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        if valid_deck_key(query.get('key', [None])[0]):
            return True
        parsed = cookies.SimpleCookie(self.headers.get('Cookie', ''))
        return deck_cookie_valid(parsed.get('deck_angel').value if parsed.get('deck_angel') else '')

    def send_redirect(self, location):
        self.send_response(308)
        self.send_header('Location', location)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def send_json(self, status, body):
        data = json.dumps(body, separators=(',', ':')).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(data)

    def send_unlock_cookie(self, key):
        self.send_response(204)
        value = deck_cookie_value(key)
        secure = '; Secure' if PUBLIC_ORIGIN.startswith('https://') else ''
        self.send_header('Set-Cookie', f'deck_angel={value}; Max-Age=2592000; Path=/deck/; HttpOnly; SameSite=Lax{secure}')
        self.send_header('Content-Length', '0')
        self._deck_response = True
        self.end_headers()

    def handle_unlock(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            length = 0
        if length < 0 or length > 16384:
            self.send_json(403, {'ok': False})
            return
        raw = self.rfile.read(length)
        try:
            if 'application/json' in self.headers.get('Content-Type', ''):
                payload = json.loads(raw.decode('utf-8'))
                value = payload.get('key') if isinstance(payload, dict) else None
            else:
                value = urllib.parse.parse_qs(raw.decode('utf-8')).get('key', [None])[0]
        except (UnicodeDecodeError, json.JSONDecodeError):
            value = None
        key = valid_deck_key(value)
        if key is None:
            self.send_json(403, {'ok': False})
        else:
            self.send_unlock_cookie(key)

    def deck_route(self):
        """Return a handled route, target path and whether it is HTML."""
        path = self.request_path()
        if path is None:
            self.send_error(404)
            return True, None, False
        query = urllib.parse.urlsplit(self.path).query
        raw_path = urllib.parse.urlsplit(self.path).path
        if path in ('/deck/angel/', '/deck/angel/index.html') and raw_path != path:
            self.send_redirect('/deck/angel/' + (f'?{query}' if query else ''))
            return True, None, False
        if path in ('/deck', '/deck/'):
            self.send_redirect('/deck/angel/' + (f'?{query}' if query else ''))
            return True, None, False
        if path == '/deck/angel' and self.command in ('GET', 'HEAD'):
            self.send_redirect('/deck/angel/' + (f'?{query}' if query else ''))
            return True, None, False
        if path == '/deck/angel/unlock':
            if self.command == 'POST':
                self.handle_unlock()
            else:
                self.send_error(404)
            return True, None, False

        relative = None
        html = False
        public = False
        if path in ('/deck/angel/', '/deck/angel/index.html'):
            relative, html = 'mycelial/index.html', True
        elif path.startswith('/deck/angel/'):
            relative = 'mycelial/' + path[len('/deck/angel/'):]
            public_name = path[len('/deck/angel/'):]
            public = public_name in DECK_PUBLIC_FILES or any(public_name.startswith(prefix) for prefix in DECK_PUBLIC_PREFIXES)
            html = relative.endswith('.html')
        elif path.startswith('/deck/assets/'):
            relative = 'assets/' + path[len('/deck/assets/'):]
            public_name = path[len('/deck/assets/'):]
            public = any(public_name.startswith(prefix) for prefix in DECK_PUBLIC_PREFIXES)
        elif (path == '/mycelial' or path.startswith('/mycelial/')) and RUNTIME_MODE == 'release':
            self.send_redirect('/deck/angel/' + (f'?{query}' if query else ''))
            return True, None, False
        elif RUNTIME_MODE == 'release' and (path == '/deck' or path.startswith('/mycelial/deck/')):
            self.send_redirect('/deck/angel/' + (f'?{query}' if query else ''))
            return True, None, False
        else:
            return False, None, False

        if relative is None:
            return True, None, html
        if path in ('/deck/angel/', '/deck/angel/index.html') and not self.deck_unlocked():
            target = self.safe_file('mycelial/gate.html')
            if target is None:
                self.send_error(404)
                return True, None, True
        else:
            if path.startswith('/deck/') and not self.deck_unlocked() and not public:
                self.send_error(404)
                return True, None, html
            target = self.safe_file(relative)
            if target is None:
                self.send_error(404)
                return True, None, html
        if path in ('/deck/angel/', '/deck/angel/index.html'):
            key = valid_deck_key(urllib.parse.parse_qs(query).get('key', [None])[0])
            self._deck_cookie_key = key
        return True, target, html

    def translate_path(self, path):
        translated = super().translate_path(path)
        if RUNTIME_MODE == 'source' and urllib.parse.urlsplit(path).path == '/runtime-release.js':
            return os.path.join(os.getcwd(), 'runtime-source.js')
        return translated

    def end_headers(self):
        request_path = self.request_path() or ''
        if getattr(self, '_deck_response', False) or request_path.startswith('/deck/'):
            self.send_header('X-Robots-Tag', 'noindex')
            self.send_header('Referrer-Policy', 'same-origin')
            self.send_header('Cache-Control', 'no-store' if getattr(self, '_deck_html', False) else 'private, no-cache')
        else:
            self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def send_head(self):
        handled, target, html = self.deck_route()
        if handled:
            if target is None:
                return None
            self._deck_response = True
            self._deck_html = html
            if getattr(self, '_deck_cookie_key', None):
                value = deck_cookie_value(self._deck_cookie_key)
                secure = '; Secure' if PUBLIC_ORIGIN.startswith('https://') else ''
                self._deck_set_cookie = f'deck_angel={value}; Max-Age=2592000; Path=/deck/; HttpOnly; SameSite=Lax{secure}'
            if 'Range' in self.headers:
                return self._range_body(str(target))
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(str(target)))
            self.send_header('Content-Length', str(os.path.getsize(target)))
            self.send_header('Last-Modified', self.date_time_string(os.path.getmtime(target)))
            if getattr(self, '_deck_set_cookie', None):
                self.send_header('Set-Cookie', self._deck_set_cookie)
            self.end_headers()
            return open(target, 'rb')
        if 'Range' in self.headers:
            path = self.translate_path(self.path)
            if self.refuses_release_mycelial_target(path):
                self.send_error(404)
                return None
            if os.path.isfile(path):
                return self._range_body(path) or None
        if self.refuses_release_mycelial_target(self.translate_path(self.path)):
            self.send_error(404)
            return None
        return super().send_head()

    def _range_body(self, path):
        """206 response for a satisfiable byte range; error already sent on
        failure, so send_head returns None and the caller stops."""
        size = os.path.getsize(path)
        value = self.headers['Range'].strip()

        # This small development server only implements one byte range.  Do
        # not silently discard later ranges: callers could otherwise receive
        # different bytes from those described by their request.
        m = re.fullmatch(r'bytes=(\d*)-(\d*)', value)
        if not m or (not m.group(1) and not m.group(2)):
            self._range_error(size)
            return None

        try:
            if not m.group(1):
                suffix_length = int(m.group(2))
                if suffix_length == 0 or size == 0:
                    self._range_error(size)
                    return None
                start = max(size - suffix_length, 0)
                end = size - 1
            else:
                start = int(m.group(1))
                end = int(m.group(2)) if m.group(2) else size - 1
        except ValueError:
            # Python limits the number of digits accepted by int(); an
            # oversized field value is still a bad range, not a server error.
            self._range_error(size)
            return None

        end = min(end, size - 1)
        if start > end or start >= size:
            self._range_error(size)
            return None
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        if getattr(self, '_deck_set_cookie', None):
            self.send_header('Set-Cookie', self._deck_set_cookie)
        self.end_headers()
        return open(path, 'rb'), start, end

    def _range_error(self, size):
        """Send the RFC-required representation size for a rejected range."""
        self.send_response(416, 'Range Not Satisfiable')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes */{size}')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        f = self.send_head()
        if f is None:
            return
        if isinstance(f, tuple):
            fh, start, end = f
            try:
                fh.seek(start)
                remaining = end - start + 1
                while remaining:
                    chunk = fh.read(min(65536, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
            finally:
                fh.close()
        else:
            self.copyfile(f, self.wfile)
            f.close()

    def do_POST(self):
        handled, _target, _html = self.deck_route()
        if not handled:
            self.send_error(404)

    def do_HEAD(self):
        f = self.send_head()
        if f is None:
            return
        if isinstance(f, tuple):
            f[0].close()
        else:
            f.close()

    def log_message(self, *a):
        pass  # quiet

class ParallelHTTPServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True
    # TCPServer defaults to five queued sockets. Chrome can churn through more
    # than that while expanding the module graph and issuing media ranges.
    request_queue_size = 128

    def handle_error(self, request, client_address):
        # A browser cancelling an obsolete image/range request is routine and
        # should not flood the terminal with a traceback.
        if isinstance(sys.exc_info()[1], (BrokenPipeError, ConnectionResetError)):
            return
        super().handle_error(request, client_address)

# :8137 by default (capture.py, pre-commit and the docs all say so), but a
# $PORT wins — multiple Claude sessions each run their own copy of this
# server, and only one of them can hold the canonical port.
PORT = int(os.environ.get('PORT', 8137))

# Browsers fetch the ES-module graph, images and media in parallel.  A plain
# TCPServer handles only one request at a time; under Chrome's eager parallel
# loader its tiny listen backlog can reset a module connection while another
# response is still being written.  ThreadingHTTPServer exists specifically
# for browsers that pre-open sockets, and daemon threads keep Ctrl-C/restarts
# prompt during local development.
with ParallelHTTPServer(('', PORT), NoCacheHandler) as httpd:
    print(f'serving glowshroom/ on :{PORT} with no-store + range support')
    httpd.serve_forever()
