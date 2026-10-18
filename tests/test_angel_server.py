"""Focused HTTP checks for the standalone Mycelial deck gate."""
import http.client
import os
import re
import socket
import subprocess
import sys
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KEY = 'AngelTest0123456789x'
ORIGIN = 'http://127.0.0.1'


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


class Server:
    def __init__(self, *, keys=KEY, mode='release'):
        self.port = free_port()
        env = {**os.environ, 'PORT': str(self.port), 'PUBLIC_ORIGIN': f'{ORIGIN}:{self.port}',
               'DECK_ANGEL_KEYS': keys, 'RUNTIME_MODE': mode}
        self.process = subprocess.Popen([sys.executable, 'serve.py'], cwd=ROOT, env=env,
                                        stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        for _ in range(100):
            try:
                with socket.create_connection(('127.0.0.1', self.port), timeout=.1):
                    return
            except OSError:
                if self.process.poll() is not None:
                    raise AssertionError(self.process.stderr.read().decode())
                time.sleep(.02)
        self.stop()
        raise AssertionError('server did not start')

    def stop(self):
        if self.process.poll() is None:
            self.process.terminate()
            self.process.wait(timeout=5)
        if self.process.stderr:
            self.process.stderr.close()

    def request(self, method, path, *, headers=None, body=None, follow=True):
        connection = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        connection.request(method, path, body=body, headers=headers or {})
        response = connection.getresponse()
        data = response.read()
        result = {'status': response.status, 'headers': response.headers, 'body': data}
        connection.close()
        if follow and response.status in (301, 302, 303, 307, 308) and response.headers.get('Location'):
            return self.request('GET', response.headers['Location'], headers=headers, follow=False)
        return result


class AngelServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.gate = ROOT / 'mycelial' / 'gate.html'
        cls.had_gate = cls.gate.exists()
        if not cls.had_gate:
            cls.gate.write_text('<!doctype html><title>temporary gate</title><p>Enter the personal key</p>', encoding='utf-8')
        cls.server = Server()

    @classmethod
    def tearDownClass(cls):
        cls.server.stop()
        if not cls.had_gate:
            cls.gate.unlink(missing_ok=True)

    def test_locked_gate_and_unlocked_cookie_asset(self):
        locked = self.server.request('GET', '/deck/angel/')
        self.assertEqual(locked['status'], 200)
        self.assertIn(b'personal key', locked['body'])
        self.assertEqual(locked['headers']['X-Robots-Tag'], 'noindex')
        self.assertEqual(locked['headers']['Referrer-Policy'], 'same-origin')
        self.assertEqual(locked['headers']['Cache-Control'], 'no-store')

        opened = self.server.request('GET', '/deck/angel/?key=' + KEY)
        self.assertEqual(opened['status'], 200)
        self.assertIn(b'<title>Mycelial</title>', opened['body'])
        cookie = opened['headers'].get('Set-Cookie')
        self.assertRegex(cookie or '', r'deck_angel=[0-9a-f]{64}; Max-Age=2592000; Path=/deck/; HttpOnly; SameSite=Lax')
        asset = self.server.request('GET', '/deck/assets/cards/arca/everyone-all-at-once.avif',
                                    headers={'Cookie': cookie.split(';', 1)[0]})
        self.assertEqual(asset['status'], 200)

    def test_unlock_endpoint_and_hygiene(self):
        self.assertEqual(self.server.request('GET', '/deck/assets/cards/arca/everyone-all-at-once.avif')['status'], 404)
        self.assertEqual(self.server.request('POST', '/deck/angel/unlock', body='key=bad',
                                             headers={'Content-Type': 'application/x-www-form-urlencoded'})['status'], 403)
        valid = self.server.request('POST', '/deck/angel/unlock', body='{"key":"' + KEY + '"}',
                                     headers={'Content-Type': 'application/json'})
        self.assertEqual(valid['status'], 204)
        for path in ('/deck/angel/.secret', '/deck/angel/%2e%2e/serve.py'):
            self.assertEqual(self.server.request('GET', path)['status'], 404)

    def test_release_encoded_and_normalized_mycelial_paths_cannot_bypass_gate(self):
        bypasses = (
            '/%6Dycelial/index.html',
            '//mycelial/index.html',
            '/assets/../mycelial/index.html',
            '/%6Dycelial/dot-transitions.js',
            '//mycelial/dot-transitions.js',
            '/assets/../mycelial/dot-transitions.js',
        )
        for path in bypasses:
            with self.subTest(path=path):
                response = self.server.request('GET', path, follow=False)
                self.assertEqual(response['status'], 308)
                self.assertEqual(response['headers']['Location'], '/deck/angel/')
                self.assertNotIn(b'<title>Mycelial', response['body'])

    def test_range_keyed_deck_response_sets_cookie_before_headers_end(self):
        response = self.server.request('GET', '/deck/angel/index.html?key=' + KEY,
                                        headers={'Range': 'bytes=0-9'})
        self.assertEqual(response['status'], 206)
        self.assertRegex(response['headers'].get('Set-Cookie', ''), r'deck_angel=[0-9a-f]{64};')

    def test_release_redirect_and_removed_key_revokes_cookie(self):
        redirected = self.server.request('GET', '/mycelial/?x=1', follow=False)
        self.assertEqual(redirected['status'], 308)
        self.assertEqual(redirected['headers']['Location'], '/deck/angel/?x=1')
        opened = self.server.request('GET', '/deck/angel/?key=' + KEY)
        cookie = opened['headers']['Set-Cookie'].split(';', 1)[0]
        revoked = Server(keys='AnotherValidKey123')
        self.addCleanup(revoked.stop)
        response = revoked.request('GET', '/deck/assets/cards/arca/everyone-all-at-once.avif',
                                   headers={'Cookie': cookie})
        self.assertEqual(response['status'], 404)

    def test_unset_env_fails_closed(self):
        locked = Server(keys='')
        self.addCleanup(locked.stop)
        self.assertEqual(locked.request('GET', '/deck/angel/?key=' + KEY)['status'], 200)
        self.assertEqual(locked.request('POST', '/deck/angel/unlock', body='key=' + KEY,
                                         headers={'Content-Type': 'application/x-www-form-urlencoded'})['status'], 403)


if __name__ == '__main__':
    unittest.main()
