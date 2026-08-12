#!/usr/bin/env bash
# Capability Compass — run every automated check in one command.
#
#   ./run_checks.sh
#
# What it does: runs the data-contract suite (fast, no browser) and the
# end-to-end browser suite (mock mode — never calls the real Claude API).
# Success looks like: "ALL CHECKS PASSED" at the end and exit code 0.

set -uo pipefail
cd "$(dirname "$0")"

fail=0

echo "── 1/2  Data contract (backend ↔ frontend alignment) ─────────────"
if node tests/contract_test.js; then
  echo "     contract suite: PASS"
else
  echo "     contract suite: FAIL"; fail=1
fi

echo
echo "── 2/2  End-to-end browser test (mock mode) ──────────────────────"
if node -e "require.resolve('playwright')" >/dev/null 2>&1; then
  if node tests/e2e_mock_test.js; then
    echo "     end-to-end suite: PASS"
  else
    echo "     end-to-end suite: FAIL"; fail=1
  fi
else
  echo "     SKIPPED — Playwright is not installed."
  echo "     To enable:  npm install playwright"
  echo "     (The contract suite above still ran and is the critical one.)"
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "✅  ALL CHECKS PASSED — safe to commit."
else
  echo "❌  SOMETHING FAILED — do not commit until it is green again."
fi
exit "$fail"
