#!/usr/bin/env bash
# One-time helper: turns the Spotify OAuth Authorization Code flow into
# "answer 3 prompts, get a refresh token." Run this locally, once.
set -euo pipefail

REDIRECT_URI="http://127.0.0.1:8888/callback"
SCOPE="user-read-recently-played"

urlencode() {
  python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$1"
}

read -rp "Spotify Client ID: " CLIENT_ID
read -rsp "Spotify Client Secret: " CLIENT_SECRET
echo

AUTH_URL="https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=$(urlencode "$REDIRECT_URI")&scope=$(urlencode "$SCOPE")"

cat <<EOF

1. Open this URL in your browser, log in, and click Agree:

${AUTH_URL}

2. The page will fail to load after you click Agree (expected — nothing is
   listening on 127.0.0.1:8888). That's fine. Just copy the FULL URL from
   your browser's address bar at that point.

EOF

read -rp "Paste the full redirect URL here: " REDIRECT_RESULT

CODE=$(python3 -c "
import urllib.parse, sys
q = urllib.parse.parse_qs(urllib.parse.urlparse(sys.argv[1]).query)
print(q.get('code', [''])[0])
" "$REDIRECT_RESULT")

if [ -z "$CODE" ]; then
  echo "Couldn't find a 'code' param in that URL. Did you copy the full address bar contents after clicking Agree?" >&2
  exit 1
fi

echo
echo "Exchanging code for tokens..."

RESPONSE=$(curl -s -X POST https://accounts.spotify.com/api/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d grant_type=authorization_code \
  -d code="$CODE" \
  -d redirect_uri="$REDIRECT_URI" \
  -d client_id="$CLIENT_ID" \
  -d client_secret="$CLIENT_SECRET")

REFRESH_TOKEN=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('refresh_token',''))")

if [ -z "$REFRESH_TOKEN" ]; then
  echo "Failed to get a refresh token. Spotify said:" >&2
  echo "$RESPONSE" >&2
  exit 1
fi

cat <<EOF

Success. Your refresh token is:

${REFRESH_TOKEN}

Now add three repo secrets (GitHub -> your repo -> Settings -> Secrets and
variables -> Actions -> New repository secret):

  SPOTIFY_CLIENT_ID      = ${CLIENT_ID}
  SPOTIFY_CLIENT_SECRET  = (the secret you just typed in)
  SPOTIFY_REFRESH_TOKEN  = ${REFRESH_TOKEN}

EOF
