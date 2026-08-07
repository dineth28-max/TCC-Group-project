#!/bin/sh
# Generates a self-signed TLS cert/key for the nginx reverse proxy (Phase 14 HTTPS fix).
# Chrome/Safari require a secure context before granting getUserMedia (camera) access — a
# self-signed cert is enough for that, it just shows a one-time browser warning to click through.
#
# Usage: ./generate-cert.sh [hostname-or-ip]
# Re-run this with the real deployed domain/IP before going live — the cert's SAN must match
# what's actually typed into the browser, or Chrome will refuse it outright (not just warn).

set -e
export MSYS_NO_PATHCONV=1 # Git Bash on Windows otherwise mangles "/CN=..." into a file path
CN="${1:-localhost}"
DIR="$(dirname "$0")"

openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout "$DIR/privkey.pem" \
  -out "$DIR/fullchain.pem" \
  -subj "/CN=$CN" \
  -addext "subjectAltName=DNS:$CN,DNS:localhost,IP:127.0.0.1"

echo "Wrote $DIR/fullchain.pem and $DIR/privkey.pem for CN=$CN"
