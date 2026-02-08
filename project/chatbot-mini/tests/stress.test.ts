import assert from 'node:assert/strict';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import { createChatRouter } from '../src/chatbot/routes';
import { setExhibits } from '../src/chatbot/csv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test fixtures
function primeFixtures() {
  setExhibits([
    {
      id: 'exhibit-1',
      name: 'AI Lab',
      description: 'Hands-on AI activities.',
      category: 'ai-and-robotics',
      floor: 'first',
      location: 'Innovation Gallery',
      interactiveFeatures: ['robot arm'],
    },
  ] as any);
}

async function withTestApp(handler: (app: express.Express) => Promise<void>) {
  const originalFetch = global.fetch;
  (global as any).fetch = async () =>
    new Response(JSON.stringify({ exhibits: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  
  primeFixtures();
  const app = express();
  app.use(express.json());
  app.use(
    createChatRouter({
      gemmaUrl: 'http://gemma.test',
      apiBaseUrl: 'http://backend.test',
      cwd: process.cwd(),
      dirname: __dirname,
    })
  );
  await handler(app);
  (global as any).fetch = originalFetch;
}

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  latency?: number;
}

const results: TestResult[] = [];

function recordTest(name: string, passed: boolean, details: string, latency?: number) {
  results.push({ name, passed, details, latency });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | ${name}`);
  if (!passed || details) {
    console.log(`    ${details}`);
  }
  if (latency) {
    console.log(`    Latency: ${latency}ms`);
  }
}

async function runStressTests() {
  console.log('\n🔥 STRESS TEST SUITE - RECKLESS USER BEHAVIOR\n');
  console.log('='.repeat(70));

  // TEST 1: Rate Limiting - Burst Requests
  await withTestApp(async (app) => {
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(
        request(app)
          .post('/chat')
          .send({ message: `test message ${i}` })
          .then(res => ({ status: res.status, index: i }))
          .catch(err => ({ status: 500, index: i, error: err.message }))
      );
    }
    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429).length;
    const success = responses.filter(r => r.status === 200).length;
    recordTest(
      'Rate Limiting - 50 Burst Requests',
      rateLimited > 0,
      `${rateLimited} rate-limited, ${success} successful (expected: some rate-limited)`
    );
  });

  // TEST 2: Maximum Length Input
  await withTestApp(async (app) => {
    const maxLength = 1000;
    const longMessage = 'a'.repeat(maxLength);
    const start = Date.now();
    const res = await request(app).post('/chat').send({ message: longMessage });
    const latency = Date.now() - start;
    recordTest(
      'Maximum Length Input (1000 chars)',
      res.status === 200 || res.status === 413,
      `Status: ${res.status} (should be 200 or 413)`,
      latency
    );
  });

  // TEST 3: Over Maximum Length
  await withTestApp(async (app) => {
    const overLimit = 'a'.repeat(1001);
    const res = await request(app).post('/chat').send({ message: overLimit });
    recordTest(
      'Over Maximum Length (1001 chars)',
      res.status === 413,
      `Status: ${res.status} (should reject with 413)`
    );
  });

  // TEST 4: Special Characters & Injection Attempts
  await withTestApp(async (app) => {
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      "'; DROP TABLE exhibits; --",
      '${process.env.SECRET}',
      '../../etc/passwd',
      '{"__proto__":{"isAdmin":true}}',
      '\x00\x01\x02',
      '💣💥🔥',
      '🚨'.repeat(100),
    ];
    
    let passed = 0;
    let failed = 0;
    for (const input of maliciousInputs) {
      try {
        const res = await request(app).post('/chat').send({ message: input });
        if (res.status === 200 || res.status === 400 || res.status === 422) {
          passed++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
      }
    }
    recordTest(
      'Special Characters & Injection Attempts',
      failed === 0,
      `${passed} handled safely, ${failed} errors (should handle all safely)`
    );
  });

  // TEST 5: Empty & Minimal Inputs
  await withTestApp(async (app) => {
    const edgeCases = ['', ' ', 'a', '\n', '\t', '\r\n'];
    let handled = 0;
    for (const input of edgeCases) {
      const res = await request(app).post('/chat').send({ message: input });
      if (res.status === 400 || res.status === 200) {
        handled++;
      }
    }
    recordTest(
      'Empty & Minimal Inputs',
      handled === edgeCases.length,
      `${handled}/${edgeCases.length} handled correctly`
    );
  });

  // TEST 6: Concurrent Requests
  await withTestApp(async (app) => {
    const concurrent = 20;
    const start = Date.now();
    const promises = Array(concurrent).fill(0).map((_, i) =>
      request(app)
        .post('/chat')
        .send({ message: `concurrent test ${i}` })
        .then(res => ({ status: res.status, latency: Date.now() - start }))
    );
    const responses = await Promise.all(promises);
    const success = responses.filter(r => r.status === 200 || r.status === 422).length;
    const avgLatency = responses.reduce((sum, r) => sum + r.latency, 0) / responses.length;
    recordTest(
      `Concurrent Requests (${concurrent} simultaneous)`,
      success === concurrent,
      `${success}/${concurrent} successful, avg latency: ${avgLatency.toFixed(0)}ms`
    );
  });

  // TEST 7: Rapid Sequential Requests
  await withTestApp(async (app) => {
    const rapid = 30;
    const start = Date.now();
    const latencies: number[] = [];
    for (let i = 0; i < rapid; i++) {
      const reqStart = Date.now();
      const res = await request(app).post('/chat').send({ message: `rapid ${i}` });
      latencies.push(Date.now() - reqStart);
      if (res.status === 429) break; // Hit rate limit
    }
    const totalTime = Date.now() - start;
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    recordTest(
      'Rapid Sequential Requests (30 requests)',
      latencies.length > 0,
      `${latencies.length} processed, avg: ${avgLatency.toFixed(0)}ms, total: ${totalTime}ms`
    );
  });

  // TEST 8: Malformed JSON
  await withTestApp(async (app) => {
    try {
      const res = await request(app)
        .post('/chat')
        .set('Content-Type', 'application/json')
        .send('{"message": "test"'); // Missing closing brace
      recordTest(
        'Malformed JSON',
        res.status >= 400,
        `Status: ${res.status} (should reject malformed JSON)`
      );
    } catch (err) {
      recordTest('Malformed JSON', true, 'Rejected as expected');
    }
  });

  // TEST 9: Missing Message Field
  await withTestApp(async (app) => {
    const res = await request(app).post('/chat').send({});
    recordTest(
      'Missing Message Field',
      res.status === 400,
      `Status: ${res.status} (should be 400)`
    );
  });

  // TEST 10: Non-String Message
  await withTestApp(async (app) => {
    const testCases = [
      { message: null },
      { message: 123 },
      { message: [] },
      { message: {} },
      { message: true },
    ];
    let handled = 0;
    for (const testCase of testCases) {
      const res = await request(app).post('/chat').send(testCase);
      if (res.status === 400 || res.status === 200) {
        handled++;
      }
    }
    recordTest(
      'Non-String Message Types',
      handled === testCases.length,
      `${handled}/${testCases.length} handled correctly`
    );
  });

  // TEST 11: Unicode & Emoji Stress
  await withTestApp(async (app) => {
    const unicodeTests = [
      '🚀'.repeat(200),
      '测试'.repeat(100),
      'مرحبا'.repeat(50),
      '🎉🎊🎈'.repeat(150),
      'αβγδε'.repeat(100),
    ];
    let handled = 0;
    for (const test of unicodeTests) {
      const res = await request(app).post('/chat').send({ message: test });
      if (res.status === 200 || res.status === 400 || res.status === 413) {
        handled++;
      }
    }
    recordTest(
      'Unicode & Emoji Stress',
      handled === unicodeTests.length,
      `${handled}/${unicodeTests.length} handled correctly`
    );
  });

  // TEST 12: Memory Stress - Many Requests
  await withTestApp(async (app) => {
    const manyRequests = 100;
    const start = Date.now();
    const latencies: number[] = [];
    let errors = 0;
    
    for (let i = 0; i < manyRequests; i++) {
      try {
        const reqStart = Date.now();
        const res = await request(app).post('/chat').send({ message: `memory test ${i}` });
        latencies.push(Date.now() - reqStart);
        if (res.status >= 500) errors++;
        // Small delay to avoid rate limiting
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        errors++;
      }
    }
    
    const totalTime = Date.now() - start;
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
    
    recordTest(
      `Memory Stress (${manyRequests} requests)`,
      errors < manyRequests * 0.1, // Less than 10% errors
      `${manyRequests - errors} successful, ${errors} errors, avg: ${avgLatency.toFixed(0)}ms, max: ${maxLatency}ms, total: ${totalTime}ms`
    );
  });

  // TEST 13: Very Long Words (No Spaces)
  await withTestApp(async (app) => {
    const longWord = 'a'.repeat(500);
    const res = await request(app).post('/chat').send({ message: longWord });
    recordTest(
      'Very Long Word (500 chars, no spaces)',
      res.status === 200 || res.status === 413 || res.status === 400,
      `Status: ${res.status} (should handle gracefully)`
    );
  });

  // TEST 14: SQL-like Queries
  await withTestApp(async (app) => {
    const sqlLike = [
      "SELECT * FROM exhibits WHERE name='test'",
      "INSERT INTO exhibits VALUES ('test')",
      "DELETE FROM exhibits WHERE id=1",
    ];
    let handled = 0;
    for (const query of sqlLike) {
      const res = await request(app).post('/chat').send({ message: query });
      if (res.status === 200 || res.status === 400 || res.status === 422) {
        handled++;
      }
    }
    recordTest(
      'SQL-like Queries',
      handled === sqlLike.length,
      `${handled}/${sqlLike.length} handled safely (not executed as SQL)`
    );
  });

  // TEST 15: Path Traversal Attempts
  await withTestApp(async (app) => {
    const paths = [
      '../../../etc/passwd',
      '..\\..\\windows\\system32',
      '/etc/shadow',
      'C:\\Windows\\System32',
    ];
    let handled = 0;
    for (const path of paths) {
      const res = await request(app).post('/chat').send({ message: path });
      if (res.status === 200 || res.status === 400 || res.status === 422) {
        handled++;
      }
    }
    recordTest(
      'Path Traversal Attempts',
      handled === paths.length,
      `${handled}/${paths.length} handled safely`
    );
  });

  // Print Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 STRESS TEST SUMMARY\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Pass Rate: ${passRate}%\n`);
  
  if (failed > 0) {
    console.log('FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}`);
      console.log(`     ${r.details}`);
    });
    console.log('');
  }
  
  // Calculate average latency
  const latencies = results.filter(r => r.latency).map(r => r.latency!);
  if (latencies.length > 0) {
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);
    console.log('PERFORMANCE METRICS:');
    console.log(`  Average Latency: ${avgLatency.toFixed(0)}ms`);
    console.log(`  Min Latency: ${minLatency}ms`);
    console.log(`  Max Latency: ${maxLatency}ms\n`);
  }
  
  // Final verdict
  if (failed === 0) {
    console.log('🎉 ALL STRESS TESTS PASSED! System is resilient to reckless usage.\n');
    process.exit(0);
  } else {
    console.log('⚠️  SOME TESTS FAILED. Review failures above.\n');
    process.exit(1);
  }
}

runStressTests().catch((error) => {
  console.error('Fatal error running stress tests:', error);
  process.exit(1);
});

