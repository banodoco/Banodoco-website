"""Server-side Discord login through the existing Hivemind Supabase authority.

The browser gets only opaque, HttpOnly cookies. Provider tokens, PKCE verifiers
and machine approval context stay here. No service-role credential is needed.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from uuid import UUID

from flask import Flask, abort, g, jsonify, redirect, render_template, request, send_file


class UpstreamError(Exception):
    """Never expose the upstream response, URL, credentials or exception text."""

    def __init__(self, status=502):
        self.status = status


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def upstream_json(url, *, key, token=None, payload=None, method=None):
    headers = {"apikey": key, "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
    req = Request(url, data=data, headers=headers, method=method)
    try:
        with build_opener(NoRedirects()).open(req, timeout=10) as response:
            raw = response.read(262145)
            if len(raw) > 262144:
                raise UpstreamError()
            return json.loads(raw) if raw else {}
    except HTTPError as error:
        raise UpstreamError(error.code) from None
    except (URLError, OSError, ValueError):
        raise UpstreamError() from None


class ExpiringStore:
    """Bounded, thread-safe single-process storage; take() is one-use/atomic."""

    def __init__(self, capacity, clock=time.time):
        self.capacity, self.clock = capacity, clock
        self.records = {}
        self.lock = threading.Lock()

    @staticmethod
    def key(value):
        return hashlib.sha256(value.encode()).digest()

    def put(self, data, ttl):
        value = secrets.token_urlsafe(32)
        with self.lock:
            now = self.clock()
            self.records = {k: v for k, v in self.records.items() if v[0] > now}
            if len(self.records) >= self.capacity:
                abort(503)
            self.records[self.key(value)] = (now + ttl, data)
        return value

    def get(self, value, *, consume=False):
        if not value or not re.fullmatch(r"[A-Za-z0-9_-]{43}", value):
            return None
        with self.lock:
            key = self.key(value)
            entry = self.records.pop(key, None) if consume else self.records.get(key)
            if entry is None:
                return None
            if entry[0] <= self.clock():
                self.records.pop(key, None)
                return None
            return entry[1]

    def take_field(self, value, field):
        # Used for machine approvals: two concurrent POSTs cannot take the same
        # capability, even before the durable upstream broker checks it.
        with self.lock:
            entry = self.records.get(self.key(value or ""))
            if not entry or entry[0] <= self.clock():
                return None
            return entry[1].pop(field, None)


def configured_origin(value, *, loopback_http=False):
    parsed = urlsplit(value)
    allowed_http = loopback_http and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
    if (parsed.scheme != "https" and not (parsed.scheme == "http" and allowed_http)) or (
        not parsed.netloc or parsed.username or parsed.password or parsed.path not in {"", "/"}
        or parsed.query or parsed.fragment
    ):
        raise ValueError("Configure an HTTPS origin (HTTP is allowed only for local APP_ORIGIN).")
    return f"{parsed.scheme}://{parsed.netloc}"


def verified_identity(user):
    if not isinstance(user, dict) or user.get("is_anonymous") is True:
        raise UpstreamError(401)
    try:
        user_id = str(UUID(user["id"]))
    except (KeyError, TypeError, ValueError, AttributeError):
        raise UpstreamError(401) from None
    identities = user.get("identities")
    if not isinstance(identities, list):
        raise UpstreamError(401)
    identity = next((item for item in identities if isinstance(item, dict)
                     and item.get("provider") == "discord"
                     and item.get("user_id", user_id) == user_id), None)
    if identity is None:
        raise UpstreamError(401)
    data = identity.get("identity_data") or {}
    if not isinstance(data, dict):
        raise UpstreamError(401)
    # Stable identity is Supabase's verified UUID, never email/display name.
    name = data.get("global_name") or data.get("full_name") or data.get("name") or "Discord member"
    discord_id = data.get("provider_id") or data.get("sub")
    return {"id": user_id, "display_name": str(name)[:100],
            "discord_id": discord_id if isinstance(discord_id, str) and discord_id.isdigit() else None}


def media_range(value, size):
    """Preserve the existing server's single-range/suffix-clamping contract."""
    match = re.fullmatch(r"bytes=(\d*)-(\d*)", value.strip())
    if not match or not any(match.groups()) or not size:
        return None
    try:
        if not match[1]:
            length = int(match[2])
            if length == 0:
                return None
            start, end = max(0, size - length), size - 1
        else:
            start = int(match[1])
            end = min(int(match[2]), size - 1) if match[2] else size - 1
    except ValueError:
        return None
    return f"bytes={start}-{end}" if start <= end and start < size else None


def create_app(*, root=None, config=None, transport=upstream_json, clock=time.time):
    root = Path(root or Path(__file__).resolve().parent).resolve()
    settings = dict(os.environ)
    settings.update(config or {})
    port = settings.get("PORT", "8137")
    if settings.get("RAILWAY_ENVIRONMENT_ID") and not settings.get("APP_ORIGIN"):
        raise ValueError("APP_ORIGIN must be set on Railway.")
    origin = configured_origin(settings.get("APP_ORIGIN", f"http://127.0.0.1:{port}"), loopback_http=True)
    provider = settings.get("SUPABASE_URL", "").strip()
    key = settings.get("SUPABASE_PUBLISHABLE_KEY", "").strip()
    if provider:
        provider = configured_origin(provider)
    ready = bool(provider and key)
    if key and not re.fullmatch(r"sb_publishable_[A-Za-z0-9_-]+", key):
        raise ValueError("Use a Supabase publishable key, never a service-role/secret key.")
    ttl = int(settings.get("SESSION_TTL_SECONDS", "3600"))
    if not 60 <= ttl <= 86400:
        raise ValueError("SESSION_TTL_SECONDS must be between 60 and 86400.")
    secure = origin.startswith("https:")
    cookie = "__Host-banodoco-session" if secure else "banodoco-session"
    oauth_cookie = "__Host-banodoco-oauth" if secure else "banodoco-oauth"
    sessions, flows = ExpiringStore(10000, clock), ExpiringStore(1024, clock)
    app = Flask(__name__, static_folder=None, template_folder=str(root))
    app.config.update(AUTH_READY=ready, MAX_CONTENT_LENGTH=16384,
                      MAX_FORM_MEMORY_SIZE=16384, MAX_FORM_PARTS=10)
    app.extensions["auth_stores"] = {"sessions": sessions, "flows": flows}

    def set_cookie(response, name, value, age):
        response.set_cookie(name, value, max_age=age, secure=secure, httponly=True,
                            samesite="Lax", path="/")

    def clear_cookie(response, name):
        response.delete_cookie(name, secure=secure, httponly=True, samesite="Lax", path="/")

    def save_session(response, value, lifetime=ttl):
        sid = sessions.put(value, lifetime)
        sessions.get(request.cookies.get(cookie), consume=True)
        set_cookie(response, cookie, sid, lifetime)

    def page(template="web_templates/account.html", **values):
        return render_template(template, user=g.session.get("user"),
                               csrf=g.session.get("csrf"), ready=ready, **values)

    def upstream(path, **kwargs):
        if not ready:
            raise UpstreamError(503)
        return transport(provider + path, key=key, **kwargs)

    def csrf_check():
        expected, supplied = g.session.get("csrf"), request.form.get("csrf", "")
        if (request.headers.get("Origin") != origin or not expected or not supplied
                or not secrets.compare_digest(expected, supplied)):
            abort(403)

    @app.before_request
    def admission():
        # Never derive redirect URLs or trusted origins from forwarding headers.
        if request.path != "/health" and request.host != urlsplit(origin).netloc:
            abort(400)
        g.session = sessions.get(request.cookies.get(cookie)) or {}
        if request.path.startswith("/api/") and request.path != "/api/auth/session":
            if not g.session.get("user"):
                return jsonify(error="authentication_required"), 401

    @app.after_request
    def secure_response(response):
        response.headers["Cache-Control"] = "no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "base-uri 'self'; object-src 'none'; frame-ancestors 'none'"
        if request.path.startswith(("/auth/", "/api/", "/app", "/connect")):
            response.headers["Content-Security-Policy"] = (
                "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self'; "
                "form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
            )
            response.headers["X-Robots-Tag"] = "noindex, nofollow"
        if secure:
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        return response

    @app.get("/health")
    def health():
        return jsonify(status="ok", auth_configured=ready)

    @app.get("/api/auth/session")
    def auth_state():
        return jsonify(authenticated=bool(g.session.get("user")), user=g.session.get("user"))

    @app.get("/api/me")
    def me():
        return jsonify(user=g.session["user"])

    @app.get("/app/")
    @app.get("/app")
    def account():
        return page()

    @app.get("/auth/login")
    def login():
        if not ready:
            return page(message="Discord sign-in is not configured yet. Please try again later."), 503
        destination = "/connect/" if request.args.get("next") == "connect" else "/app/"
        verifier = secrets.token_urlsafe(48)
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
        # Supabase owns Discord's OAuth state. This one-use HttpOnly flow cookie
        # binds the server-held PKCE verifier to this browser. No verifier means
        # no exchange; a code stolen from another browser fails PKCE upstream.
        flow = {"verifier": verifier, "next": destination,
                "old_session": request.cookies.get(cookie), "connection": g.session.get("connection")}
        flows.get(request.cookies.get(oauth_cookie), consume=True)
        flow_id = flows.put(flow, 600)
        query = urlencode({"provider": "discord", "redirect_to": origin + "/auth/callback",
                           "code_challenge": challenge, "code_challenge_method": "S256"})
        response = redirect(provider + "/auth/v1/authorize?" + query, 303)
        set_cookie(response, oauth_cookie, flow_id, 600)
        return response

    @app.get("/auth/callback")
    def callback():
        flow = flows.get(request.cookies.get(oauth_cookie), consume=True)
        code = request.args.get("code", "")
        if not flow or request.args.get("error") or not code or len(code) > 4096 or len(request.args.getlist("code")) != 1:
            response = app.make_response((page(message="Sign-in expired or was cancelled. Please start again."), 400))
        else:
            try:
                payload = upstream("/auth/v1/token?grant_type=pkce", payload={
                    "auth_code": code, "code_verifier": flow["verifier"]})
                access = payload.get("access_token") if isinstance(payload, dict) else None
                if not isinstance(access, str) or not 1 <= len(access) <= 16384:
                    raise UpstreamError(401)
                user = verified_identity(upstream("/auth/v1/user", token=access))
                remaining = int(payload.get("expires_in", 0))
                if "expires_at" in payload:
                    remaining = min(remaining, int(payload["expires_at"]) - int(clock()))
                lifetime = min(ttl, remaining - 30)
                if lifetime < 1:
                    raise UpstreamError(401)
                response = redirect(flow["next"], 303)
                value = {"user": user, "access_token": access, "csrf": secrets.token_urlsafe(32),
                         "connection": flow.get("connection")}
                save_session(response, value, lifetime)
                sessions.get(flow.get("old_session"), consume=True)
                # refresh_token and Discord provider_token are deliberately discarded.
            except (UpstreamError, ValueError, TypeError):
                response = app.make_response((page(message="Discord sign-in could not be completed. Please try again."), 502))
        clear_cookie(response, oauth_cookie)
        return response

    @app.post("/auth/logout")
    def logout():
        csrf_check()
        session = sessions.get(request.cookies.get(cookie), consume=True) or {}
        flows.get(request.cookies.get(oauth_cookie), consume=True)
        response = redirect("/", 303)
        clear_cookie(response, cookie)
        clear_cookie(response, oauth_cookie)
        if session.get("access_token"):
            try:
                upstream("/auth/v1/logout?scope=local", token=session["access_token"], method="POST")
            except UpstreamError:
                pass  # local revocation is unconditional, even if Auth is unavailable
        return response

    def connection_page(**values):
        return page("connect/index.html", **values)

    @app.get("/connect/")
    @app.get("/connect/index.html")
    @app.get("/connect")
    def connection():
        if "request" in request.args or "approval_code" in request.args:
            token, code = request.args.get("request", ""), request.args.get("approval_code", "")
            if (len(request.args.getlist("request")) != 1 or len(request.args.getlist("approval_code")) != 1
                    or not re.fullmatch(r"[A-Za-z0-9_-]{32,512}", token)
                    or not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", code)):
                return connection_page(message="This connection link is invalid. Start a new login from your local tool."), 400
            pairing = {"request_token": token, "approval_code": code}
            response = redirect("/connect/", 303)
            if g.session.get("user"):
                # Capturing a connection must not extend the authenticated TTL.
                g.session.update(connection=pairing, csrf=secrets.token_urlsafe(32))
            else:
                save_session(response, {"connection": pairing, "csrf": secrets.token_urlsafe(32)}, 600)
            return response
        pairing = g.session.get("connection")
        if not pairing or not g.session.get("user"):
            return connection_page(pairing=pairing)
        try:
            preview = upstream("/functions/v1/contributor-auth?" + urlencode({"request": pairing["request_token"]}))
            preview = preview.get("request", preview) if isinstance(preview, dict) else {}
            if (not isinstance(preview, dict) or preview.get("status") != "pending"
                    or not isinstance(preview.get("machine_label"), str)):
                raise UpstreamError(400)
            return connection_page(pairing=pairing, machine=preview["machine_label"][:200])
        except UpstreamError:
            return connection_page(message="This connection is unavailable or has expired. Start a new login from your local tool."), 400

    @app.post("/connect/approve")
    def approve():
        if not g.session.get("user"):
            abort(401)
        csrf_check()
        pairing = sessions.take_field(request.cookies.get(cookie), "connection")
        if not pairing:
            abort(400)
        try:
            result = upstream("/functions/v1/contributor-auth", token=g.session["access_token"],
                              payload={"action": "approve", **pairing})
            if not isinstance(result, dict) or result.get("status") != "approved":
                raise UpstreamError()
            return connection_page(success=True)
        except UpstreamError:
            return connection_page(message="The connection was not approved. Start a new login from your local tool."), 400

    @app.get("/", defaults={"path": "index.html"})
    @app.get("/<path:path>")
    def public_file(path):
        # Python/templates ship in the artifact to run the server, not as assets.
        parts = Path(path).parts
        public_roots = {"assets", "content", "journey", "journey-v6", "organism", "ownership", "static", "vendor"}
        public_files = {"index.html", "404.html", "favicon.ico", "flags.js", "hero.css", "inspire-exits.js",
                        "main.js", "robots.txt", "site.webmanifest", "sitemap.xml", "release-revision.txt"}
        if (any(p.startswith(".") or "\\" in p for p in parts)
                or not (path in public_files or parts and parts[0] in public_roots)):
            abort(404)
        target = root.joinpath(*parts)
        if target.is_dir():
            target /= "index.html"
        if root not in target.resolve().parents or any(p.is_symlink() for p in [target, *target.parents] if p != root and root in p.parents):
            abort(404)
        if target.suffix.lower() not in {".html", ".css", ".js", ".json", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".mp4", ".woff2", ".bin", ".webmanifest", ".xml", ".txt"}:
            abort(404)
        if not target.is_file():
            abort(404)
        if "Range" in request.headers:
            size = target.stat().st_size
            normalized = media_range(request.headers["Range"], size)
            if normalized is None:
                return "", 416, {"Content-Range": f"bytes */{size}", "Accept-Ranges": "bytes"}
            request.environ["HTTP_RANGE"] = normalized
        return send_file(target, conditional=True, max_age=0)

    return app
