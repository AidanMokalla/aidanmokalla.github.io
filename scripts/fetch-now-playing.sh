#!/usr/bin/env bash
# Refreshes a Spotify access token and writes the most recently played
# track to assets/now-playing.json. Meant to be run in CI (see
# .github/workflows/spotify-now-playing.yml) but works locally too if the
# three SPOTIFY_* env vars are exported.
set -euo pipefail

: "${SPOTIFY_CLIENT_ID:?missing SPOTIFY_CLIENT_ID}"
: "${SPOTIFY_CLIENT_SECRET:?missing SPOTIFY_CLIENT_SECRET}"
: "${SPOTIFY_REFRESH_TOKEN:?missing SPOTIFY_REFRESH_TOKEN}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_FILE="${REPO_ROOT}/assets/now-playing.json"

ACCESS_TOKEN=$(curl -s -X POST https://accounts.spotify.com/api/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d grant_type=refresh_token \
  -d refresh_token="$SPOTIFY_REFRESH_TOKEN" \
  -d client_id="$SPOTIFY_CLIENT_ID" \
  -d client_secret="$SPOTIFY_CLIENT_SECRET" \
  | jq -r '.access_token // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Failed to refresh access token." >&2
  exit 1
fi

RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://api.spotify.com/v1/me/player/recently-played?limit=1")

if [ "$(echo "$RESPONSE" | jq '.items | length')" = "0" ]; then
  echo "No recently played tracks returned." >&2
  exit 1
fi

echo "$RESPONSE" | jq '{
  track: .items[0].track.name,
  artist: [.items[0].track.artists[].name] | join(", "),
  album: .items[0].track.album.name,
  album_art: .items[0].track.album.images[0].url,
  track_url: .items[0].track.external_urls.spotify,
  track_id: .items[0].track.id,
  played_at: .items[0].played_at,
  updated_at: (now | todate)
}' > "$OUT_FILE"

cat "$OUT_FILE"
