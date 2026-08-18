#!/bin/bash
cd "$(dirname "$0")"
(sleep 1.5; open http://localhost:8137) &
exec python3 serve.py
