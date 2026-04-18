#!/usr/bin/env bash
# Apply a Supabase migration via the Management API.
# Requires SUPABASE_ACCESS_TOKEN in env (persisted via setx on Windows).
#
# Usage: ./scripts/run-migration.sh supabase/migrations/008_add_customer_requested_swaps.sql
#
# Project ref is hard-coded for the luxury-decking-fieldpro project in ca-central-1.

set -euo pipefail

PROJECT_REF="jcxvkyfmoiwayxfmgnif"
MIGRATION_FILE="${1:-}"

if [[ -z "$MIGRATION_FILE" ]]; then
  echo "Usage: $0 <path-to-sql-file>"
  exit 1
fi

if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "Migration file not found: $MIGRATION_FILE"
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "SUPABASE_ACCESS_TOKEN env var not set. Run: setx SUPABASE_ACCESS_TOKEN \"sbp_...\""
  exit 1
fi

export PATH="/c/Users/railm/nodejs/node-v22.15.0-win-x64:$PATH"

echo "Applying $MIGRATION_FILE to project $PROJECT_REF ..."

RESPONSE=$(node -e "
const fs = require('fs');
const sql = fs.readFileSync(process.argv[1], 'utf8');
process.stdout.write(JSON.stringify({ query: sql }));
" "$MIGRATION_FILE" | curl -s -X POST \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @- \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query")

echo "Response: $RESPONSE"

# Exit non-zero if the response contains an error key
if echo "$RESPONSE" | grep -qi '"error"\|"message"' && ! echo "$RESPONSE" | grep -q '^\[\]$\|^\[{'; then
  echo "Migration may have failed. Check response above."
  exit 1
fi

echo "✓ Migration applied successfully."
