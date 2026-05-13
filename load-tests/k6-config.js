import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const loanListDuration = new Trend('loan_list_duration');
const dashboardDuration = new Trend('dashboard_duration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'admin@test.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'Test1234';

export const options = {
  scenarios: {
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'normal' },
    },
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 500 },
        { duration: '3m', target: 500 },
        { duration: '2m', target: 0 },
      ],
      startTime: '20m',
      tags: { scenario: 'peak' },
    },
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 500 },
        { duration: '2m', target: 700 },
        { duration: '2m', target: 1000 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      startTime: '40m',
      tags: { scenario: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.1'],
    login_duration: ['p(95)<3000'],
    loan_list_duration: ['p(95)<2000'],
    dashboard_duration: ['p(95)<3000'],
  },
};

function login() {
  const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });

  loginDuration.add(res.timings.duration);

  const success = check(res, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => JSON.parse(r.body).token !== undefined,
  });

  errorRate.add(!success);

  if (success) {
    return JSON.parse(res.body).token;
  }
  return null;
}

export default function () {
  const token = login();
  if (!token) return;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  group('Dashboard', () => {
    const res = http.get(`${BASE_URL}/dashboard/kpis`, { headers });
    dashboardDuration.add(res.timings.duration);
    check(res, { 'dashboard 200': (r) => r.status === 200 });
    sleep(1);
  });

  group('List Loans', () => {
    const res = http.get(`${BASE_URL}/loans`, { headers });
    loanListDuration.add(res.timings.duration);
    check(res, { 'loans 200': (r) => r.status === 200 });
    sleep(1);
  });

  group('List Clients', () => {
    const res = http.get(`${BASE_URL}/clients`, { headers });
    check(res, { 'clients 200': (r) => r.status === 200 });
    sleep(1);
  });

  group('Financial Statements', () => {
    const res = http.get(`${BASE_URL}/financial-statements/trial-balance`, { headers });
    check(res, { 'trial-balance 200': (r) => r.status === 200 });
    sleep(1);
  });

  group('IFRS9 Provisions', () => {
    const res = http.get(`${BASE_URL}/ifrs9/portfolio-provisions`, { headers });
    check(res, { 'ifrs9 200': (r) => r.status === 200 });
    sleep(1);
  });

  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/healthz`);
    check(res, { 'health 200': (r) => r.status === 200 });
  });

  sleep(Math.random() * 3);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  return `
=== NEO FMC LOAD TEST RESULTS ===
Total Requests: ${data.metrics.http_reqs?.values?.count || 0}
Failed Requests: ${data.metrics.http_req_failed?.values?.rate ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0}%
Avg Response Time: ${data.metrics.http_req_duration?.values?.avg?.toFixed(0) || 0}ms
P95 Response Time: ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(0) || 0}ms
P99 Response Time: ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(0) || 0}ms
Max VUs: ${data.metrics.vus_max?.values?.max || 0}
  `;
}
