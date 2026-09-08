#!/bin/sh
set -eu

DERIV_APP_ID="${DERIV_APP_ID:-1089}"

case "$DERIV_APP_ID" in
  ''|*[!0-9]*)
    echo "Invalid DERIV_APP_ID; using fallback 1089" >&2
    DERIV_APP_ID=1089
    ;;
esac

# Keep the public app_id configurable without exposing any secret.
sed -i "s/app_id=1089/app_id=${DERIV_APP_ID}/g" /app/index.html

# Connect the existing login link to the server-side OAuth endpoint and load
# the small session controller. The OAuth access token never enters the page.
sed -i 's#https://track.deriv.com/_PZZnG4RWbBdZl7VyVw174GNd7ZgqdRLk/1/#/api/auth/login#' /app/index.html
sed -i 's#</body>#<script src="/auth.js"></script></body>#' /app/index.html

exec "$@"
