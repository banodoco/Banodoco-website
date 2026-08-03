#!/usr/bin/env python3
"""Static server for glowshroom/ with caching DISABLED.

Replaces the plain http.server that served :8137 without cache headers —
Chrome caches ES modules aggressively, so every edit needed manual
cache-busting and reviewers kept seeing stale builds. no-store fixes it
for everyone. Run: python3 serve.py
"""
import http.server, socketserver, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a):
        pass  # quiet

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', 8137), NoCacheHandler) as httpd:
    print('serving glowshroom/ on :8137 with no-store')
    httpd.serve_forever()
