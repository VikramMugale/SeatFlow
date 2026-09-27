/**
 * Concurrency test: N parallel reservation attempts on the same seat.
 * Expected: exactly 1 success, N-1 failures with SEAT_LOCKED / SEATS_UNAVAILABLE.
 *
 * Usage:
 *   1. Start API + Redis + Postgres
 *   2. Seed data and note a showId + available show_seat id
 *   3. Login as customer, put accessToken below
 *   4. node scripts/concurrency-test.js
 */
const http = require('http');

const API = 'http://localhost:3000';
const ACCESS_TOKEN = process.env.TOKEN || 'PASTE_ACCESS_TOKEN';
const SHOW_ID = process.env.SHOW_ID || 'PASTE_SHOW_ID';
const SEAT_ID = process.env.SEAT_ID || 'PASTE_SHOW_SEAT_ID';
const CONCURRENCY = parseInt(process.env.N || '50', 10);

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log(`Launching ${CONCURRENCY} concurrent reservation attempts on seat ${SEAT_ID}...`);
  const start = Date.now();

  const promises = Array.from({ length: CONCURRENCY }, (_, i) =>
    request('POST', '/api/reservations', {
      showId: SHOW_ID,
      seatIds: [SEAT_ID],
    }).then((r) => ({ index: i, ...r }))
  );

  const results = await Promise.all(promises);
  const elapsed = Date.now() - start;

  const success = results.filter((r) => r.status === 201);
  const failed = results.filter((r) => r.status !== 201);

  console.log('\n=== Results ===');
  console.log(`Total:     ${CONCURRENCY}`);
  console.log(`Success:   ${success.length}  (expected: 1)`);
  console.log(`Rejected:  ${failed.length}  (expected: ${CONCURRENCY - 1})`);
  console.log(`Elapsed:   ${elapsed}ms`);

  if (success.length === 1 && failed.length === CONCURRENCY - 1) {
    console.log('\n✅ PASS — Redis distributed lock prevented double booking');
  } else {
    console.log('\n❌ FAIL — Unexpected success/failure counts');
    success.forEach((s) => console.log('  Success:', s.body));
  }
}

main().catch(console.error);
