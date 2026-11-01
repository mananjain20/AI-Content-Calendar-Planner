import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

/**
 * Initializes and returns the authenticated Google Sheets API client.
 * Supports credentials via file path or direct JSON environment variable.
 */
export const getSheetsClient = async () => {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId || spreadsheetId === 'your_google_spreadsheet_id_here') {
    return {
      configured: false,
      reason: 'GOOGLE_SHEET_ID is not configured in server/.env'
    };
  }

  try {
    let auth;
    const credsPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './credentials.json';
    const resolvedPath = path.resolve(process.cwd(), credsPath);

    // Option A: Service account file on disk
    if (fs.existsSync(resolvedPath)) {
      auth = new google.auth.GoogleAuth({
        keyFile: resolvedPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    }
    // Option B: Service account JSON string in environment variable (useful for cloud hosting like Render)
    else if (process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    } else {
      return {
        configured: false,
        reason: `Service account credentials not found at ${resolvedPath} and GOOGLE_SERVICE_ACCOUNT_CREDENTIALS is not set.`
      };
    }

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    return {
      configured: true,
      sheets,
      spreadsheetId
    };

  } catch (error) {
    console.warn('[GoogleSheetsConfig Warning]:', error.message);
    return {
      configured: false,
      reason: error.message
    };
  }
};

