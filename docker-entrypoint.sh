#!/bin/sh
set -eu

# DERIV_APP_ID is public configuration, not a secret.
# Keep a safe fallback so the demo still starts if the Render variable is missing.
DERIV_APP_ID="${DERIV_APP_ID:-1089}"

# Inject the runtime Render value into the static demo before nginx starts.
# Only numeric App IDs are accepted to avoid accidentally modifying the page with unsafe text.
case "$DERIV_APP_ID" in
  ''|*[!0-9]*)
    echo "Invalid DERIV_APP_ID; using fallback 1089" >&2
    DERIV_APP_ID=1089
    ;;
esac

sed -i "s/app_id=1089/app_id=${DERIV_APP_ID}/g" /usr/share/nginx/html/index.html

exec "$@"
