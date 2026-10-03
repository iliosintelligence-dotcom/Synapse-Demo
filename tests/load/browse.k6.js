// k6 load test for the read-only buyer path (static pages).
// NOT run automatically. Run it by hand, against a staging copy if you have
// one. The default is deliberately small. Raise STAGES only with a plan for
// Vercel and Supabase limits and cost, and never to 1,000 users on production
// without telling the providers first.
//
//   k6 run -e BASE_URL=https://www.synapsecore.dev tests/load/browse.k6.js
//   k6 run -e STAGES=100,500,1000 ...   (ramps to each number of users in turn)
import http from 'k6/http';
import { check, sleep } from 'k6';

const base = __ENV.BASE_URL || 'https://www.synapsecore.dev';
const levels = (__ENV.STAGES || '10').split(',').map(Number);
export const options = {
  stages: levels
    .flatMap((n) => [{ duration: '1m', target: n }, { duration: '2m', target: n }])
    .concat([{ duration: '30s', target: 0 }]),
  thresholds: { http_req_failed: ['rate<0.02'], http_req_duration: ['p(95)<2500'] },
};

export default function () {
  for (const p of ['/', '/app/browse.html', '/app/toju.html']) {
    const r = http.get(base + p);
    check(r, { ['200 ' + p]: (x) => x.status === 200 });
    sleep(1 + Math.random() * 2);
  }
}
