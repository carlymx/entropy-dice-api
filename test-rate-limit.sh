#!/bin/bash
# Test suite for EntropyDice rate limiting v0.8.0
# Usage: bash test-rate-limit.sh

set -e

SERVER_PID=""
PASS=0
FAIL=0

cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT

start_server() {
    cleanup; rm -f data/rate-limit.json; sleep 0.5
    RATE_LIMIT_WINDOW_MS=10000 RATE_LIMIT_MAX=50 RATE_LIMIT_DAILY=6 BAN_MAX_STRIKES=2 \
        node server.js > /tmp/server.log 2>&1 &
    SERVER_PID=$!; sleep 2
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "ERROR: Server failed to start"; cat /tmp/server.log; exit 1
    fi
}

assert_status() {
    local desc="$1" expected="$2" url="$3"
    local actual
    actual=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    [ "$actual" = "$expected" ] \
        && { echo "  PASS: $desc (HTTP $actual)"; PASS=$((PASS+1)); } \
        || { echo "  FAIL: $desc → esperado $expected, obtenido $actual"; FAIL=$((FAIL+1)); }
}

get_header() {
    curl -s -D- "$1" 2>/dev/null | grep -i "^$2:" | awk '{print $2}' | tr -d '\r'
}

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  EntropyDice Rate Limiting — Test Suite      ║"
echo "╚══════════════════════════════════════════════╝"

echo ""; echo "━━━ 1. PETICIONES NORMALES ━━━━━━━━━━━━━━━━━━━"
start_server
for i in 1 2 3; do
    assert_status "Petición normal #$i" 200 "http://localhost:3000/roll?q=D6"
done

echo ""; echo "━━━ 2. HEADERS ─━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
rb=$(get_header "http://localhost:3000/roll?q=D20" "ratelimit-remaining")
rd=$(get_header "http://localhost:3000/roll?q=D20" "x-ratelimit-daily-remaining")
[ -n "$rb" ] && { echo "  PASS: RateLimit-Remaining=$rb"; PASS=$((PASS+1)); } \
    || { echo "  FAIL: RateLimit-Remaining ausente"; FAIL=$((FAIL+1)); }
[ -n "$rd" ] && { echo "  PASS: X-RateLimit-Daily-Remaining=$rd"; PASS=$((PASS+1)); } \
    || { echo "  FAIL: X-RateLimit-Daily-Remaining ausente"; FAIL=$((FAIL+1)); }

echo ""; echo "━━━ 3. LÍMITE DE RÁFAGA ─────────────────────"
cleanup; rm -f data/rate-limit.json; sleep 0.5
RATE_LIMIT_WINDOW_MS=5000 RATE_LIMIT_MAX=3 RATE_LIMIT_DAILY=100 BAN_MAX_STRIKES=5 \
    node server.js > /tmp/server.log 2>&1 &
SERVER_PID=$!; sleep 2
for i in $(seq 1 3); do
    assert_status "Ráfaga #$i (debe pasar)" 200 "http://localhost:3000/roll?q=D6"
done
assert_status "Ráfaga #4 (debe fallar 429)" 429 "http://localhost:3000/roll?q=D6"

echo ""; echo "━━━ 4. LÍMITE DIARIO ────────────────────────"
start_server
for i in $(seq 1 6); do
    assert_status "Diaria #$i (debe pasar)" 200 "http://localhost:3000/roll?q=D6"
done
assert_status "Diaria #7 (debe fallar 429)" 429 "http://localhost:3000/roll?q=D6"

echo ""; echo "━━━ 5. STRIKES → BAN PERMANENTE ────────────"
start_server
echo "   → 6 OK + 1 (strike#1,429) + 1 (strike#2,403) + 1 (403)"
echo "   Llenando contador diario (6 req)..."
for i in $(seq 1 6); do
    curl -s -o /dev/null http://localhost:3000/roll?q=D6
done

r1=$(curl -s -w "\n%{http_code}" http://localhost:3000/roll?q=D6)
code1=$(echo "$r1" | tail -n 1)
body1=$(echo "$r1" | head -n -1)
strikes1=$(echo "$body1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('strikes','?'))" 2>/dev/null)
echo "   7ª → HTTP $code1, strikes=$strikes1"
[ "$code1" = "429" ] && [ "$strikes1" = "1" ] \
    && { echo "  PASS: Strike #1 registrado"; PASS=$((PASS+1)); } \
    || { echo "  FAIL: Strike #1 → esperado 429, strikes=1"; FAIL=$((FAIL+1)); }

r2=$(curl -s -w "\n%{http_code}" http://localhost:3000/roll?q=D6)
code2=$(echo "$r2" | tail -n 1)
[ "$code2" = "403" ] && echo "  PASS: Ban permanente" && PASS=$((PASS+1)) \
    || { echo "  FAIL: Ban → esperado 403"; FAIL=$((FAIL+1)); }

assert_status "Verificación post-ban (403)" 403 "http://localhost:3000/roll?q=D6"

echo ""; echo "━━━ 6. BAN PERSISTE TRAS REINICIO ──────────"
cleanup; sleep 0.5
RATE_LIMIT_WINDOW_MS=10000 RATE_LIMIT_MAX=50 RATE_LIMIT_DAILY=6 BAN_MAX_STRIKES=2 \
    node server.js > /tmp/server.log 2>&1 &
SERVER_PID=$!; sleep 2
assert_status "Ban persiste tras reinicio" 403 "http://localhost:3000/roll?q=D6"

echo ""; echo "━━━ 7. BAN MANUAL (BANNED_IPS) ───────────────"
cleanup; rm -f data/rate-limit.json; sleep 0.5
BANNED_IPS="::1,127.0.0.1" RATE_LIMIT_WINDOW_MS=10000 RATE_LIMIT_MAX=50 \
    node server.js > /tmp/server.log 2>&1 &
SERVER_PID=$!; sleep 2
assert_status "Manual BANNED_IPS (403)" 403 "http://localhost:3000/roll?q=D6"

echo ""; echo "━━━ 8. SERVIDOR LIMPIO FUNCIONA ─────────────"
cleanup; rm -f data/rate-limit.json; sleep 0.5
RATE_LIMIT_WINDOW_MS=10000 RATE_LIMIT_MAX=50 RATE_LIMIT_DAILY=6 BAN_MAX_STRIKES=2 \
    node server.js > /tmp/server.log 2>&1 &
SERVER_PID=$!; sleep 2
assert_status "Servidor limpio funciona" 200 "http://localhost:3000/roll?q=D100"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  RESUMEN                                     ║"
echo "║  Pasados: $PASS   Fallados: $FAIL                ║"
[ "$FAIL" -eq 0 ] && echo "║  ✓ TODOS LOS TESTS PASARON                    ║" \
    || echo "║  ✗ HAY FALLOS                                 ║"
echo "╚══════════════════════════════════════════════╝"

cleanup; rm -f data/rate-limit.json 2>/dev/null
exit $FAIL
