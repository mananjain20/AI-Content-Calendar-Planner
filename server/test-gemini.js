/**
 * Minimal Gemini connectivity test.
 * Reads GEMINI_API_KEY from server/.env — never prints or exposes it.
 * Usage: node test-gemini.js
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const key = process.env.GEMINI_API_KEY || '';

console.log('\n=========================================');
console.log('🧪 Gemini Live API Connectivity Test');
console.log('=========================================');
console.log('[test-gemini] Key prefix (first 6 chars):', key.substring(0, 6));
console.log('[test-gemini] Key length:', key.length, 'chars');

if (!key || key.length < 10) {
  console.error('\n❌ GEMINI_API_KEY is missing or empty in server/.env.');
  console.error('   Please check line 7 of server/.env.');
  process.exit(1);
}

// Test model — tries the configured model, and falls back to gemini-2.5-flash / gemini-2.0-flash if 404
const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
console.log(`[test-gemini] Testing primary model: "${primaryModel}"`);
console.log('[test-gemini] Sending live request to Google API...\n');

const genAI = new GoogleGenerativeAI(key);

async function testModel(modelName) {
  console.log(`[test-gemini] Requesting response from: ${modelName}...`);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent('Respond with short JSON: {"status":"ok"}');
  const text = result.response.text().trim();
  return text;
}

try {
  let responseText;
  try {
    responseText = await testModel(primaryModel);
    console.log(`\n✅ SUCCESS with model "${primaryModel}"!`);
    console.log('   Google API Response:', responseText);
  } catch (primaryErr) {
    console.warn(`\n⚠️ Primary model "${primaryModel}" failed:`, primaryErr.message);

    // If model name is not recognized by Google API (404), test standard models
    if (primaryErr.message.includes('404') || primaryErr.message.includes('not found')) {
      console.log('\n[test-gemini] Testing fallback model: "gemini-2.5-flash"...');
      try {
        responseText = await testModel('gemini-2.5-flash');
        console.log('\n✅ SUCCESS with fallback model "gemini-2.5-flash"!');
        console.log('   Google API Response:', responseText);
        console.log('\n💡 Recommendation: Add GEMINI_MODEL=gemini-2.5-flash to server/.env');
      } catch (fallback25Err) {
        console.log('[test-gemini] Testing fallback model: "gemini-2.0-flash"...');
        responseText = await testModel('gemini-2.0-flash');
        console.log('\n✅ SUCCESS with fallback model "gemini-2.0-flash"!');
        console.log('   Google API Response:', responseText);
        console.log('\n💡 Recommendation: Add GEMINI_MODEL=gemini-2.0-flash to server/.env');
      }
    } else {
      throw primaryErr;
    }
  }

  console.log('\n🎉 Live Gemini API integration verified successfully!\n');
} catch (err) {
  const msg = err.message || '';
  console.error('\n❌ Gemini API request failed.');
  console.error('   Raw Error Message:', msg);

  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
    console.error('\n   → Google rejected this API key. Verify that the key is enabled and has no IP restrictions in https://aistudio.google.com/');
  } else if (msg.includes('404') || msg.includes('not found')) {
    console.error('\n   → The requested model was not found on Google Generative Language API.');
  } else if (msg.includes('fetch failed')) {
    console.error('\n   → Network socket failure: Node could not connect to generativelanguage.googleapis.com.');
    console.error('     Check internet connection or DNS in your terminal.');
  }
  process.exit(1);
}
