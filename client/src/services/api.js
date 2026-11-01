// Centralized API client for frontend to backend communication
// Auto-detects whether the app is running on the same port or ports 5001/5002
const CANDIDATE_URLS = [
  '/api',
  import.meta.env.VITE_API_BASE_URL,
  'http://localhost:5001/api',
  'http://localhost:5002/api'
].filter(Boolean);

let cachedBaseUrl = '/api';

export const getApiBaseUrl = async () => {
  for (const url of CANDIDATE_URLS) {
    try {
      const healthUrl = url === '/api'
        ? '/api/health'
        : (url.endsWith('/api') ? `${url.slice(0, -4)}/api/health` : `${url}/health`);
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(800) });
      if (res.ok) {
        cachedBaseUrl = url;
        return url;
      }
    } catch (_) {}
  }
  return cachedBaseUrl;
};

/**
 * Sends campaign parameters to backend to generate content calendar,
 * validate outputs, and sync to Google Sheets.
 */
export const generateCalendarPlan = async (campaignData) => {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/calendar/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(campaignData)
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMessage = data?.error?.message || `Generation failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
};

/**
 * Loads clearly-labelled demo calendar data from the backend.
 * Runs through the real validation engine — not AI-generated content.
 */
export const loadDemoCalendar = async () => {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/calendar/demo`);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data?.error?.message || 'Failed to load demo calendar');
  }

  return data;
};

/**
 * Validates a single post draft against platform rules.
 * Returns the full audit object with per-check results.
 */
export const validateSinglePost = async (post) => {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/calendar/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data?.error?.message || 'Validation request failed');
  }

  return data.audit;
};

/**
 * Retrieves all saved campaigns from local persistent storage.
 */
export const fetchAllCampaigns = async () => {
  try {
    const baseUrl = await getApiBaseUrl();
    const res = await fetch(`${baseUrl}/calendar/campaigns`);
    const data = await res.json();
    return data.success ? data.campaigns : [];
  } catch (error) {
    console.warn('[API] Could not fetch saved campaigns:', error.message);
    return [];
  }
};

/**
 * Retrieves the latest saved campaign from local persistent storage.
 */
export const fetchLatestCampaign = async () => {
  try {
    const baseUrl = await getApiBaseUrl();
    const res = await fetch(`${baseUrl}/calendar/campaigns/latest`);
    const data = await res.json();
    return data.success ? data.campaign : null;
  } catch (error) {
    console.warn('[API] Could not fetch latest campaign:', error.message);
    return null;
  }
};

/**
 * Updates a saved campaign persistently (e.g. caption edits, re-validation).
 */
export const updateSavedCampaign = async (campaignId, updates) => {
  try {
    const baseUrl = await getApiBaseUrl();
    const res = await fetch(`${baseUrl}/calendar/campaigns/${encodeURIComponent(campaignId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    return data.success ? data.campaign : null;
  } catch (error) {
    console.warn('[API] Failed to update saved campaign:', error.message);
    return null;
  }
};

/**
 * Deletes a saved campaign from persistent storage.
 */
export const deleteSavedCampaign = async (campaignId) => {
  try {
    const baseUrl = await getApiBaseUrl();
    const res = await fetch(`${baseUrl}/calendar/campaigns/${encodeURIComponent(campaignId)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    return Boolean(data.success && data.deleted);
  } catch (error) {
    console.warn('[API] Failed to delete saved campaign:', error.message);
    return false;
  }
};

/**
 * Checks backend health.
 */
export const checkHealth = async () => {
  try {
    const baseUrl = await getApiBaseUrl();
    const healthUrl = baseUrl === '/api'
      ? '/api/health'
      : (baseUrl.endsWith('/api') ? `${baseUrl.slice(0, -4)}/api/health` : `${baseUrl}/health`);
    const response = await fetch(healthUrl);
    return await response.json();
  } catch (error) {
    return { status: 'offline', error: error.message };
  }
};
