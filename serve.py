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
import http.server, os, re, sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def send_head(self):
        if 'Range' in self.headers:
            path = self.translate_path(self.path)
            if os.path.isfile(path):
                return self._range_body(path) or None
        return super().send_head()

    def _range_body(self, path):
        """206 response for a satisfiable byte range; error already sent on
        failure, so send_head returns None and the caller stops."""
        size = os.path.getsize(path)
        m = re.match(r'bytes=(\d*)-(\d*)', self.headers['Range'])
        if not m:
            self.send_error(416, 'Range Not Satisfiable')
            return None
        start = int(m.group(1)) if m.group(1) else 0
        end = int(m.group(2)) if m.group(2) else size - 1
        end = min(end, size - 1)
        if start > end or start >= size:
            self.send_error(416, 'Range Not Satisfiable')
            return None
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        return open(path, 'rb'), start, end

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
