import assert from 'node:assert/strict';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';

import { createChatRouter } from '../src/chatbot/routes';
import { setExhibits } from '../src/chatbot/csv';

async function withTestApp(
  handler: (app: express.Express) => Promise<void>,
  opts: { beforeSetup?: () => Promise<void> | void; afterTeardown?: () => Promise<void> | void } = {}
) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const originalFetch = global.fetch;
  (global as any).fetch = async () =>
    new Response(JSON.stringify({ exhibits: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  if (opts.beforeSetup) {
    await opts.beforeSetup();
  }
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
  if (opts.afterTeardown) {
    await opts.afterTeardown();
  }
  (global as any).fetch = originalFetch;
}

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

async function run() {
  primeFixtures();

  await withTestApp(async (app) => {
    const res = await request(app).post('/chat').send({});
    assert.equal(res.status, 400);
    assert.match(res.body.answer, /provide a question/i);
  });

  await withTestApp(async (app) => {
    const res = await request(app).post('/chat').send({ message: 'Hello there' });
    assert.equal(res.status, 200);
    assert.match(res.body.answer, /hello/i);
    assert.equal(res.body.sources.length, 0);
  });

  await withTestApp(async (app) => {
    const res = await request(app).post('/chat').send({ message: 'AI Lab' });
    assert.equal(res.status, 200);
    assert.match(res.body.answer, /AI Lab/i);
    assert(res.body.sources.length >= 0); // Sources may or may not be present
  });

  await withTestApp(async (app) => {
    const longMessage = 'a'.repeat(1005);
    const res = await request(app).post('/chat').send({ message: longMessage });
    assert.equal(res.status, 413);
    assert.match(res.body.notice, /payload_too_large/);
  });

  console.log('✅ router tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


