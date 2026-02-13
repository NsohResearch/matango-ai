/**
 * k6 Load Test - Smoke Test
 * 
 * Basic load test to verify system stability under moderate load.
 * Run with: k6 run tests/load/k6-smoke.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const healthCheckDuration = new Trend("health_check_duration");
const apiDuration = new Trend("api_duration");

// Test configuration
export const options = {
  // Smoke test: low load to verify basic functionality
  stages: [
    { duration: "30s", target: 5 },   // Ramp up to 5 users
    { duration: "1m", target: 10 },   // Stay at 10 users
    { duration: "30s", target: 0 },   // Ramp down
  ],
  
  thresholds: {
    http_req_duration: ["p(95)<500"],  // 95% of requests under 500ms
    errors: ["rate<0.01"],              // Error rate under 1%
    health_check_duration: ["p(99)<200"], // Health checks under 200ms
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  group("Health Checks", () => {
    // Health endpoint
    const healthRes = http.get(\`\${BASE_URL}/api/health\`);
    healthCheckDuration.add(healthRes.timings.duration);
    
    const healthCheck = check(healthRes, {
      "health status is 200": (r) => r.status === 200,
      "health response is ok": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.ok === true;
        } catch {
          return false;
        }
      },
    });
    
    errorRate.add(!healthCheck);
  });

  group("Public API", () => {
    // Test public tRPC endpoint (system.health)
    const apiRes = http.post(
      \`\${BASE_URL}/api/trpc/system.health\`,
      JSON.stringify({}),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    apiDuration.add(apiRes.timings.duration);
    
    const apiCheck = check(apiRes, {
      "api status is 200": (r) => r.status === 200,
    });
    
    errorRate.add(!apiCheck);
  });

  // Simulate user think time
  sleep(Math.random() * 2 + 1);
}

/**
 * Setup function - runs once before the test
 */
export function setup() {
  console.log(\`Starting load test against \${BASE_URL}\`);
  
  // Verify the server is reachable
  const res = http.get(\`\${BASE_URL}/api/health\`);
  if (res.status !== 200) {
    throw new Error(\`Server not reachable at \${BASE_URL}\`);
  }
  
  return { startTime: Date.now() };
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(\`Load test completed in \${duration.toFixed(2)}s\`);
}
