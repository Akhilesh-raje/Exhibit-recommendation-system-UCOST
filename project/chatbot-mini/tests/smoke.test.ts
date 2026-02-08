import assert from 'node:assert/strict';

import { generateAnswer } from '../src/chatbot/answer';
import { parseIntent, significantTokens } from '../src/chatbot/nlp';

function testIntentParsing() {
  const parsed = parseIntent('Show top 3 physics exhibits for kids');
  assert.equal(parsed.intent, 'list', 'intent should be list');
  assert.equal(parsed.topic, 'physics', 'topic should normalize to physics');
  assert.equal(parsed.count, 3, 'count should be extracted from query');
  assert(parsed.confidence && parsed.confidence > 0.5, 'confidence should exceed 0.5');
}

function testStopwordFilter() {
  const tokens = significantTokens(['what', 'are', 'physics', 'exhibits']);
  assert.deepEqual(tokens, ['physics'], 'stopwords must be removed and keywords preserved');
}

function testAnswerFormatting() {
  const answer = generateAnswer(
    'Tell me about the AI Lab',
    [
      {
        id: 'cmf97q5bu0004snwdrse4ovgo',
        name: 'AI Lab',
        description: 'Hands-on AI and robotics activities for curious visitors.',
        category: 'ai-and-robotics',
        floor: 'first',
        location: 'Innovation Gallery',
        interactiveFeatures: ['coding station', 'robot arm demo', 'vision kiosk'],
      },
    ],
    {
      singleSummaryMaxChars: 160,
      listSummaryMaxChars: 120,
    }
  );

  assert(answer.includes('AI Lab'), 'answer should mention exhibit name');
  assert(!answer.includes('**'), 'answer must not contain markdown bold');
  assert(!answer.includes('📍'), 'answer must not include emoji');
  assert(/Where to find it:/i.test(answer), 'location hint should be included for single exhibit answers');
}

testIntentParsing();
testStopwordFilter();
testAnswerFormatting();

console.log('✅ smoke tests passed');


