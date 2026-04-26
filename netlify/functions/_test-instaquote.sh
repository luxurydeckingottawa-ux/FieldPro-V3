#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# InstaQuote endpoint smoke test
#
# Usage:
#   # against local netlify dev:
#   BASE=http://localhost:8888 bash netlify/functions/_test-instaquote.sh
#
#   # against deployed prod:
#   BASE=https://fieldpro.netlify.app bash netlify/functions/_test-instaquote.sh
#
# Prereqs:
#   - jq (for pretty-printing responses)
#   - uuidgen (macOS / Linux) OR Python fallback for UUID generation
# ─────────────────────────────────────────────────────────────────────────────

set -u

BASE="${BASE:-http://localhost:8888}"
URL="${BASE}/api/instaquote-lead"
ORIGIN="https://luxurydecking.ca"
EMAIL_GOOD="qa+$(date +%s)@example.com"

# UUID helper that works on Windows Git Bash too (no uuidgen)
new_uuid() {
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr '[:upper:]' '[:lower:]'
  else
    python -c "import uuid;print(uuid.uuid4())"
  fi
}

NOW_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

show() {
  local label="$1"; shift
  echo
  echo "──────────────────────────────────────────────────────────────────"
  echo "▶ ${label}"
  echo "──────────────────────────────────────────────────────────────────"
  "$@"
}

post() {
  # post <origin> <body-file>
  local origin="$1"; local body_file="$2"
  curl -sS -i \
    -X POST "${URL}" \
    -H "Content-Type: application/json" \
    -H "Origin: ${origin}" \
    -H "Referer: ${origin}/pages/instaquote" \
    --data-binary "@${body_file}" \
    | sed -e 's/\r$//'
}

mk_body() {
  # mk_body <out-file> <submission_id> <email> <honeypot>
  cat > "$1" <<JSON
{
  "submission_id": "$2",
  "email": "$3",
  "honeypot": "$4",
  "config": {
    "width_ft": 14,
    "length_ft": 16,
    "sqft": 224,
    "perimeter_lin_ft": 60,
    "steps": 4,
    "railing_material": "aluminum",
    "railing_sides": 3,
    "railing_lin_ft": 42.75
  },
  "estimates": {
    "silver":   { "low": 31600, "high": 38400 },
    "gold":     { "low": 44800, "high": 54900 },
    "platinum": { "low": 54700, "high": 66500 }
  },
  "meta": {
    "page_url": "${ORIGIN}/pages/instaquote",
    "user_agent": "test-suite/1.0",
    "submitted_at_utc": "${NOW_ISO}"
  }
}
JSON
}

TMP="$(mktemp -d)"
trap "rm -rf '${TMP}'" EXIT

# ── Test 1: Happy path ──────────────────────────────────────────────────────
SUB1="$(new_uuid)"
mk_body "${TMP}/happy.json" "${SUB1}" "${EMAIL_GOOD}" ""
show "1. Happy path → expect 200 ok:true" post "${ORIGIN}" "${TMP}/happy.json"

# ── Test 2: Invalid email → 400 ─────────────────────────────────────────────
SUB2="$(new_uuid)"
mk_body "${TMP}/badmail.json" "${SUB2}" "not-an-email" ""
show "2. Invalid email → expect 400 validation_error" post "${ORIGIN}" "${TMP}/badmail.json"

# ── Test 3: Wrong origin → 403 ──────────────────────────────────────────────
SUB3="$(new_uuid)"
mk_body "${TMP}/badorigin.json" "${SUB3}" "qa3@example.com" ""
show "3. Forbidden origin → expect 403 forbidden_origin" post "https://evil.example.com" "${TMP}/badorigin.json"

# ── Test 4: Honeypot populated → 202 silent ─────────────────────────────────
SUB4="$(new_uuid)"
mk_body "${TMP}/honey.json" "${SUB4}" "qa4@example.com" "I am a bot"
show "4. Honeypot populated → expect 202, NO lead row created" post "${ORIGIN}" "${TMP}/honey.json"

# ── Test 5: Replay submission_id → 409 idempotent ──────────────────────────
mk_body "${TMP}/replay.json" "${SUB1}" "${EMAIL_GOOD}" ""
show "5. Replay submission_id from test 1 → expect 409 idempotent:true" post "${ORIGIN}" "${TMP}/replay.json"

# ── Test 6: Rate limit (6th submission in an hour) ─────────────────────────
echo
echo "──────────────────────────────────────────────────────────────────"
echo "▶ 6. Rate limit — fire 5 fresh submissions then expect 6th = 429"
echo "──────────────────────────────────────────────────────────────────"
for i in 2 3 4 5 6; do
  SUB="$(new_uuid)"
  mk_body "${TMP}/rl-${i}.json" "${SUB}" "qa-rl-${i}-$(date +%s)@example.com" ""
  echo
  echo "→ submission #${i} (submission_id=${SUB})"
  post "${ORIGIN}" "${TMP}/rl-${i}.json" | head -1
done
echo
echo "(submission #6 should be HTTP/1.1 429 Too Many Requests)"

# ── Test 7: CORS preflight ─────────────────────────────────────────────────
echo
echo "──────────────────────────────────────────────────────────────────"
echo "▶ 7. CORS preflight → expect 204 with Allow-Origin echoed back"
echo "──────────────────────────────────────────────────────────────────"
curl -sS -i \
  -X OPTIONS "${URL}" \
  -H "Origin: ${ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  | sed -e 's/\r$//' | head -20

echo
echo "Done."
