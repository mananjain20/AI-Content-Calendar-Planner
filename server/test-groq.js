/**
 * Groq API connectivity and model verification test.
 * Reads GROQ_API_KEY or GEMINI_API_KEY from server/.env.
 * Usage: node test-groq.js
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const apiKey = process.env.GROQ_API_KEY || (process.env.GEMINI_API_KEY?.startsWith('gsk_') ? process.env.GEMINI_API_KEY : '');
const model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

console.log('\n=========================================');
console.log('🚀 Groq Cloud API Connectivity Test');
console.log('=========================================');
console.log('[test-groq] Model:', model);
console.log('[test-groq] Key prefix:', apiKey ? apiKey.substring(0, 7) : '(missing)');
console.log('[test-groq] Key length:', apiKey ? apiKey.length : 0);

if (!apiKey) {
  console.error('\n❌ No Groq API key found in server/.env.');
  console.error('   Please set: GROQ_API_KEY=gsk_...');
  process.exit(1);
}

try {
  console.log('[test-groq] Sending request to https://api.groq.com/openai/v1/chat/completions...');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a social media AI assistant. Respond strictly in JSON.' },
        { role: 'user', content: 'Return a JSON object: {"status":"online","model":"' + model + '","message":"Groq integration working!"}' }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_completion_tokens: 1024
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('\n❌ Groq API error response:');
    console.error(`   HTTP ${response.status}: ${data.error?.message || JSON.stringify(data)}`);
    process.exit(1);
  }

  const content = data.choices?.[0]?.message?.content;
  console.log('\n✅ SUCCESS — Groq API responded in real-time!');
  console.log('   Model used:', data.model);
  console.log('   Response content:', content);
  console.log('   Total tokens:', data.usage?.total_tokens);
  console.log('\n🎉 Groq platform integration is 100% verified and operational!\n');

} catch (err) {
  console.error('\n❌ Network or execution error:', err.message);
  process.exit(1);
}

