"""HTTP-level auth tests with a simulated PKCE authority; no live credentials."""
import base64
from concurrent.futures import ThreadPoolExecutor
import hashlib
import re
import sys
import unittest
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from webapp import ExpiringStore, UpstreamError, create_app, upstream_json

ORIGIN = "https://www.banodoco.test"
PROVIDER = "https://auth.banodoco.test"
USER_ID = "ba69cdc2-f2c0-4b7a-8b37-9d29441b851c"
TOKEN = "server-only-access-token"
PAIRING = "r" * 43
CODE = "12ab34cd"
COOKIE = "__Host-banodoco-session"
FLOW_COOKIE = "__Host-banodoco-oauth"


class FakeAuthority:
    def __init__(self):
        self.codes = {}
        self.calls = []
        self.approvals = []
        self.fail = None
        self.expires = 3600
        self.preview = {"status": "pending", "machine_label": "My laptop"}
        self.user = {"id": USER_ID, "is_anonymous": False, "identities": [
            {"provider": "discord", "user_id": USER_ID,
             "identity_data": {"sub": "123456789012345678", "global_name": "Member"}}]}

    def __call__(self, url, **options):
        self.calls.append((url, options))
        assert url.startswith(PROVIDER + "/")
        assert options["key"] == "sb_publishable_fake"
        if self.fail and self.fail in url:
            raise UpstreamError(503)
        if "/token?" in url:
            body = options["payload"]
            challenge = base64.urlsafe_b64encode(hashlib.sha256(body["code_verifier"].encode()).digest()).rstrip(b"=").decode()
            expected = self.codes.pop(body["auth_code"], None)
            if challenge != expected:
                raise UpstreamError(400)
            return {"access_token": TOKEN, "expires_in": self.expires,
                    "refresh_token": "discard-this-refresh", "provider_token": "discard-this-discord"}
        if url.endswith("/auth/v1/user"):
            assert options["token"] == TOKEN
            return self.user
        if "/logout?" in url:
            assert options["token"] == TOKEN
            return {}
        if "contributor-auth?" in url:
            assert "token" not in options
            return self.preview
        if url.endswith("/contributor-auth"):
            assert options["token"] == TOKEN
            assert options["payload"] == {"action": "approve", "request_token": PAIRING, "approval_code": CODE}
            self.approvals.append(USER_ID)
            return {"status": "approved", "contributor_id": 42}
        raise AssertionError("Unexpected upstream request")


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.now = 1000
        self.authority = FakeAuthority()
        self.config = {"APP_ORIGIN": ORIGIN, "SUPABASE_URL": PROVIDER,
                       "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_fake", "SESSION_TTL_SECONDS": "3600"}
        self.app = create_app(config=self.config, transport=self.authority, clock=lambda: self.now)
        self.app.testing = True
        self.client = self.app.test_client()

    def get(self, path, client=None, **kwargs):
        response = (client or self.client).get(path, base_url=ORIGIN, **kwargs)
        self.addCleanup(response.close)
        return response

    def post(self, path, *, data=None, origin=ORIGIN, client=None):
        return (client or self.client).post(path, base_url=ORIGIN, data=data,
                                          headers={"Origin": origin} if origin else {})

    def begin(self, client=None, next_path=""):
        response = self.get("/auth/login" + next_path, client)
        self.assertEqual(response.status_code, 303)
        location = urlsplit(response.location)
        self.assertEqual(location.netloc, "auth.banodoco.test")
        params = parse_qs(location.query)
        self.assertEqual(params["provider"], ["discord"])
        self.assertEqual(params["redirect_to"], [ORIGIN + "/auth/callback"])
        self.assertEqual(params["code_challenge_method"], ["S256"])
        self.assertNotIn("state", params)  # Supabase owns provider-facing state
        code = f"code-{len(self.authority.codes)}-{len(self.authority.calls)}"
        self.authority.codes[code] = params["code_challenge"][0]
        return code, response

    def login(self, client=None, next_path=""):
        code, _ = self.begin(client, next_path)
        response = self.get("/auth/callback?code=" + code, client)
        self.assertEqual(response.status_code, 303)
        return response

    def csrf(self, page="/app/"):
        body = self.get(page).get_data(as_text=True)
        return re.search(r'name="csrf" value="([^"]+)"', body).group(1)

    def capture(self):
        response = self.get(f"/connect/?request={PAIRING}&approval_code={CODE}")
        self.assertEqual(response.status_code, 303)
        self.assertEqual(response.location, "/connect/")

    def test_public_baseline_and_guest_states(self):
        response = self.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Banodoco is a community focused on the open source AI art space.", response.data)
        self.assertIn(b"const count = 148;", response.data)
        self.assertIn(b"Continue with Discord", self.get("/app/").data)
        self.assertEqual(self.get("/api/auth/session").json, {"authenticated": False, "user": None})

    def test_api_and_approval_are_protected_including_head_and_unknown_api(self):
        for path in ["/api/me", "/api/future", "/api/me?user_id=" + USER_ID]:
            self.assertEqual(self.get(path).status_code, 401)
            self.assertEqual(self.client.head(path, base_url=ORIGIN).status_code, 401)
        self.assertEqual(self.post("/connect/approve").status_code, 401)

    def test_oauth_cookie_is_secure_and_verifier_is_not_sent_to_browser(self):
        _, response = self.begin()
        header = response.headers["Set-Cookie"]
        for attribute in ["__Host-banodoco-oauth", "Secure", "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=600"]:
            self.assertIn(attribute, header)
        self.assertNotIn("code_verifier", response.location)
        self.assertNotIn("Domain=", header)

    def test_callback_without_flow_cookie_cannot_exchange(self):
        self.assertEqual(self.get("/auth/callback?code=stolen").status_code, 400)
        self.assertEqual(self.authority.calls, [])

    def test_forged_flow_cookie_is_rejected(self):
        self.client.set_cookie(FLOW_COOKIE, "x" * 43, domain="www.banodoco.test")
        self.assertEqual(self.get("/auth/callback?code=stolen").status_code, 400)
        self.assertEqual(self.authority.calls, [])

    def test_code_from_other_browser_cannot_log_victim_in(self):
        attacker = self.app.test_client()
        attacker_code, _ = self.begin(attacker)
        self.begin()
        self.assertEqual(self.get("/auth/callback?code=" + attacker_code).status_code, 502)
        self.assertEqual(self.get("/api/me").status_code, 401)

    def test_expired_flow_and_replayed_callback_fail(self):
        code, _ = self.begin()
        self.now += 601
        self.assertEqual(self.get("/auth/callback?code=" + code).status_code, 400)
        self.login()
        self.assertEqual(self.get("/auth/callback?code=" + code).status_code, 400)

    def test_cancelled_login_consumes_flow_and_hides_provider_error(self):
        self.begin()
        response = self.get("/auth/callback?error=access_denied&error_description=SECRET")
        self.assertEqual(response.status_code, 400)
        self.assertNotIn(b"SECRET", response.data)
        self.assertIsNone(self.client.get_cookie(FLOW_COOKIE, domain="www.banodoco.test"))

    def test_authenticated_state_contains_identity_not_tokens(self):
        response = self.login()
        self.assertEqual(response.location, "/app/")
        for attribute in ["Secure", "HttpOnly", "SameSite=Lax", "Path=/"]:
            self.assertIn(attribute, response.headers.getlist("Set-Cookie")[0])
        self.assertEqual(self.get("/api/me").json["user"]["id"], USER_ID)
        self.assertTrue(self.get("/api/auth/session").json["authenticated"])
        for path in ["/app/", "/api/auth/session", "/api/me", "/connect/"]:
            response = self.get(path)
            for secret in [TOKEN, "discard-this-refresh", "discard-this-discord"]:
                self.assertNotIn(secret, response.get_data(as_text=True) + str(response.headers))
        stored = list(self.app.extensions["auth_stores"]["sessions"].records.values())
        self.assertNotIn("discard-this", str(stored))

    def test_session_rotation_and_old_cookie_revocation(self):
        self.capture()
        old = self.client.get_cookie(COOKIE, domain="www.banodoco.test").value
        self.login()
        new = self.client.get_cookie(COOKIE, domain="www.banodoco.test").value
        self.assertNotEqual(old, new)
        self.assertIsNone(self.app.extensions["auth_stores"]["sessions"].get(old))

    def test_session_expires_before_upstream_token(self):
        self.authority.expires = 90
        self.login()
        self.now += 61
        self.assertEqual(self.get("/api/me").status_code, 401)

    def test_connection_capture_does_not_extend_authenticated_lifetime(self):
        self.authority.expires = 90
        self.login()
        self.now += 55
        self.capture()
        self.now += 6
        self.assertEqual(self.get("/api/me").status_code, 401)

    def test_session_tampering_fails_closed(self):
        self.login()
        self.client.set_cookie(COOKIE, "f" * 43, domain="www.banodoco.test")
        self.assertEqual(self.get("/api/me").status_code, 401)

    def test_non_discord_anonymous_and_wrong_identity_rejected(self):
        for user in [{"id": USER_ID, "identities": []},
                     {**self.authority.user, "is_anonymous": True},
                     {"id": USER_ID, "identities": [{"provider": "discord", "user_id": "someone-else"}]}]:
            self.authority.user = user
            code, _ = self.begin()
            self.assertEqual(self.get("/auth/callback?code=" + code).status_code, 502)
            self.assertEqual(self.get("/api/me").status_code, 401)

    def test_display_name_is_html_escaped(self):
        self.authority.user["identities"][0]["identity_data"]["global_name"] = "<script>alert(1)</script>"
        self.login()
        page = self.get("/app/").get_data(as_text=True)
        self.assertIn("&lt;script&gt;", page)
        self.assertNotIn("<script>", page)

    def test_redirect_and_forwarded_host_cannot_change_callback(self):
        response = self.login(next_path="?next=https://evil.test")
        self.assertEqual(response.location, "/app/")
        response = self.get("/auth/login", headers={"X-Forwarded-Host": "evil.test", "X-Forwarded-Proto": "http"})
        self.assertIn("https%3A%2F%2Fwww.banodoco.test%2Fauth%2Fcallback", response.location)
        self.assertEqual(self.client.get("/auth/login", base_url="https://evil.test").status_code, 400)

    def test_logout_requires_post_csrf_and_origin_and_revokes_session(self):
        self.login()
        csrf = self.csrf()
        self.assertIn(self.get("/auth/logout").status_code, (404, 405))
        for data, origin in [({}, ORIGIN), ({"csrf": csrf}, "https://evil.test"), ({"csrf": csrf}, None)]:
            self.assertEqual(self.post("/auth/logout", data=data, origin=origin).status_code, 403)
            self.assertEqual(self.get("/api/me").status_code, 200)
        old = self.client.get_cookie(COOKIE, domain="www.banodoco.test").value
        self.assertEqual(self.post("/auth/logout", data={"csrf": csrf}).status_code, 303)
        self.client.set_cookie(COOKIE, old, domain="www.banodoco.test")
        self.assertEqual(self.get("/api/me").status_code, 401)

    def test_logout_still_revokes_local_session_during_upstream_outage(self):
        self.login()
        self.authority.fail = "/logout?"
        self.assertEqual(self.post("/auth/logout", data={"csrf": self.csrf()}).status_code, 303)
        self.assertEqual(self.get("/api/me").status_code, 401)

    def test_login_and_preview_never_auto_approve_machine(self):
        self.capture()
        self.assertIn(b"Continue with Discord", self.get("/connect/").data)
        response = self.login(next_path="?next=connect")
        self.assertEqual(response.location, "/connect/")
        self.assertIn(b"My laptop", self.get("/connect/").data)
        self.assertEqual(self.authority.approvals, [])

    def test_machine_approval_reuses_verified_identity_and_is_one_use(self):
        self.login()
        self.capture()
        csrf = self.csrf("/connect/")
        self.assertEqual(self.post("/connect/approve", data={"csrf": "wrong"}).status_code, 403)
        self.assertEqual(self.post("/connect/approve", data={"csrf": csrf}, origin="https://evil.test").status_code, 403)
        response = self.post("/connect/approve", data={"csrf": csrf, "request_token": "attacker", "user_id": "attacker", "action": "redeem"})
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Thank you!", response.data)
        self.assertEqual(self.authority.approvals, [USER_ID])
        self.assertEqual(self.post("/connect/approve", data={"csrf": csrf}).status_code, 400)

    def test_invalid_and_expired_machine_requests_fail_closed(self):
        self.assertEqual(self.get("/connect/?request=short&approval_code=bad").status_code, 400)
        self.login()
        self.capture()
        self.authority.preview["status"] = "expired"
        self.assertEqual(self.get("/connect/").status_code, 400)

    def test_server_source_secrets_templates_and_traversal_not_http_assets(self):
        for path in ["/serve.py", "/webapp.py", "/.env", "/.git/config", "/requirements.txt", "/package.json",
                     "/web_templates/base.html", "/connect/auth-flow.js", "/tools/release.sh",
                     "/assets/../web_templates/base.html", "/assets/%2e%2e/webapp.py", "/assets/%2eenv"]:
            self.assertEqual(self.get(path).status_code, 404, path)
        self.assertNotIn(b"{%", self.get("/connect/index.html").data)

    def test_sensitive_responses_not_cached_and_not_framable(self):
        for path in ["/auth/login", "/auth/callback", "/app/", "/api/me", "/connect/"]:
            response = self.get(path)
            self.assertIn("no-store", response.headers["Cache-Control"])
            self.assertEqual(response.headers["Referrer-Policy"], "no-referrer")
            self.assertIn("frame-ancestors 'none'", response.headers["Content-Security-Policy"])

    def test_missing_configuration_keeps_site_public_and_protected_actions_closed(self):
        app = create_app(config={**self.config, "SUPABASE_URL": "", "SUPABASE_PUBLISHABLE_KEY": ""})
        client = app.test_client()
        self.assertEqual(self.get("/", client).status_code, 200)
        self.assertEqual(self.get("/auth/login", client).status_code, 503)
        self.assertEqual(self.get("/api/me", client).status_code, 401)

    def test_insecure_remote_origins_and_service_keys_are_rejected(self):
        for options in [{"APP_ORIGIN": "http://banodoco.test"}, {"SUPABASE_URL": "http://auth.test"},
                        {"SUPABASE_PUBLISHABLE_KEY": "sb_secret_bad"}]:
            with self.assertRaises(ValueError):
                create_app(config={**self.config, **options})

    def test_local_http_cookies_are_usable_and_still_httponly(self):
        app = create_app(config={**self.config, "APP_ORIGIN": "http://127.0.0.1:8137"})
        response = app.test_client().get("/auth/login", base_url="http://127.0.0.1:8137")
        self.assertIn("banodoco-oauth=", response.headers["Set-Cookie"])
        self.assertIn("HttpOnly", response.headers["Set-Cookie"])
        self.assertNotIn("Secure", response.headers["Set-Cookie"])

    def test_store_consumption_is_atomic_and_expired_records_are_cleaned(self):
        store = ExpiringStore(1, lambda: self.now)
        sid = store.put({"connection": {"request_token": PAIRING}}, 60)
        with ThreadPoolExecutor(max_workers=8) as workers:
            results = list(workers.map(lambda _: store.take_field(sid, "connection"), range(8)))
        self.assertEqual(sum(item is not None for item in results), 1)
        self.now += 61
        self.assertIsNone(store.get(sid))
        self.assertIsNotNone(store.put({}, 60))

    def test_http_transport_does_not_follow_redirects_with_bearer(self):
        from webapp import NoRedirects
        self.assertIsNone(NoRedirects().redirect_request(None, None, 302, "", {}, "https://evil.test"))
        with patch("webapp.build_opener") as opener:
            opener.return_value.open.side_effect = TimeoutError()
            with self.assertRaises(UpstreamError):
                upstream_json(PROVIDER, key="public", token=TOKEN)


if __name__ == "__main__":
    unittest.main()
