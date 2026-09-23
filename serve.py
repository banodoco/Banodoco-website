#!/usr/bin/env python3
"""Banodoco HTTP entry point. The Railway start command stays unchanged."""
import os
from pathlib import Path

from dotenv import load_dotenv
from waitress import serve

from webapp import create_app


if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    load_dotenv(root / ".env", override=False)
    port = int(os.environ.get("PORT", "8137"))
    app = create_app(root=root)
    print(f"serving Banodoco on :{port} (auth {'ready' if app.config['AUTH_READY'] else 'not configured'})", flush=True)
    # One process, multiple threads: opaque sessions live only in server memory.
    # Waitress strips untrusted forwarding headers; callbacks use APP_ORIGIN.
    serve(app, host="0.0.0.0", port=port, threads=8,
          max_request_body_size=16384, channel_timeout=30, expose_tracebacks=False)
