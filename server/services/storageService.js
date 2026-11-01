import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'campaigns.json');

/**
 * Ensures the data directory and campaigns.json file exist.
 */
const ensureStorageFile = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[StorageService] Error ensuring storage file:', err.message);
  }
};

/**
 * Safely reads all campaigns from the local JSON file.
 * Returns an array of campaign records.
 */
export const readAllCampaigns = () => {
  ensureStorageFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[StorageService] Error reading campaigns:', err.message);
    return [];
  }
};

/**
 * Safely writes an array of campaigns to the local JSON file.
 */
const writeAllCampaigns = (campaigns) => {
  ensureStorageFile();
  try {
    // Write atomically via a temporary file to prevent corruption
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(campaigns, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (err) {
    console.error('[StorageService] Error writing campaigns:', err.message);
    return false;
  }
};

/**
 * Retrieves all saved campaigns, sorted by latest updated first.
 */
export const getAllCampaigns = () => {
  const campaigns = readAllCampaigns();
  return campaigns.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
};

/**
 * Retrieves the most recently created or updated campaign.
 */
export const getLatestCampaign = () => {
  const sorted = getAllCampaigns();
  return sorted.length > 0 ? sorted[0] : null;
};

/**
 * Retrieves a campaign by its unique ID.
 */
export const getCampaignById = (id) => {
  if (!id) return null;
  const campaigns = readAllCampaigns();
  return campaigns.find((c) => c.campaignId === id || c.id === id) || null;
};

/**
 * Saves a new campaign or completely updates an existing one by campaignId.
 */
export const saveCampaign = (record) => {
  if (!record || (!record.campaignId && !record.id)) {
    throw new Error('Campaign record must include a valid campaignId');
  }

  const campaignId = record.campaignId || record.id;
  const now = new Date().toISOString();
  const campaigns = readAllCampaigns();

  const existingIndex = campaigns.findIndex((c) => c.campaignId === campaignId || c.id === campaignId);

  const entry = {
    campaignId,
    id: campaignId,
    createdAt: existingIndex >= 0 ? campaigns[existingIndex].createdAt : now,
    updatedAt: now,
    campaignParams: record.campaignParams || {},
    data: record.data || { posts: [] },
    validation: record.validation || null
  };

  if (existingIndex >= 0) {
    campaigns[existingIndex] = entry;
  } else {
    campaigns.unshift(entry);
  }

  writeAllCampaigns(campaigns);
  console.log(`[StorageService] Persisted campaign "${campaignId}" (Total saved: ${campaigns.length})`);
  return entry;
};

/**
 * Updates selective fields of an existing campaign (e.g. updated captions or recalculation).
 */
export const updateCampaign = (id, updates = {}) => {
  if (!id) return null;

  const campaigns = readAllCampaigns();
  const index = campaigns.findIndex((c) => c.campaignId === id || c.id === id);

  if (index === -1) {
    return null;
  }

  const current = campaigns[index];
  const updated = {
    ...current,
    ...updates,
    campaignId: current.campaignId,
    id: current.campaignId,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
    data: {
      ...current.data,
      ...(updates.data || {}),
      posts: updates.posts || updates.data?.posts || current.data?.posts || []
    },
    validation: updates.validation !== undefined ? updates.validation : current.validation
  };

  campaigns[index] = updated;
  writeAllCampaigns(campaigns);
  console.log(`[StorageService] Updated campaign "${id}"`);
  return updated;
};

/**
 * Deletes a campaign by ID.
 */
export const deleteCampaign = (id) => {
  if (!id) return false;
  const campaigns = readAllCampaigns();
  const filtered = campaigns.filter((c) => c.campaignId !== id && c.id !== id);

  if (filtered.length === campaigns.length) {
    return false; // Nothing was removed
  }

  writeAllCampaigns(filtered);
  console.log(`[StorageService] Deleted campaign "${id}" (Remaining: ${filtered.length})`);
  return true;
};

