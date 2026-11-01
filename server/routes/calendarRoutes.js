import express from 'express';
import {
  generateCalendar,
  validateDraftPost,
  getSheetsStatus,
  getDemoCalendar,
  syncSheetsDirect,
  listCampaigns,
  getCampaign,
  updateCampaignData,
  removeCampaign,
  getLatestSavedCampaign
} from '../controllers/calendarController.js';

const router = express.Router();

// Primary workflow endpoint: Generate calendar + validate + persist to storage
router.post('/generate', generateCalendar);

// Persistent Storage Endpoints
router.get('/campaigns', listCampaigns);
router.get('/campaigns/latest', getLatestSavedCampaign);
router.get('/campaigns/:id', getCampaign);
router.put('/campaigns/:id', updateCampaignData);
router.delete('/campaigns/:id', removeCampaign);

// Demo endpoint: returns labelled sample data run through the real validation engine
router.get('/demo', getDemoCalendar);

// Standalone validation endpoint for testing/demonstrating rules
router.post('/validate', validateDraftPost);

// Status check for Google Sheets connectivity
router.get('/sheets-status', getSheetsStatus);

// Trigger-Action endpoint: Manual or re-sync to Google Sheets
router.post('/sync-sheets', syncSheetsDirect);

export default router;

