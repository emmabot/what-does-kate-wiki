// Wikipedia Reading Tracker — Background Script (Safari)
// Receives article visit messages from content script and POSTs to the backend API.

'use strict';

// Browser API compatibility shim
const api = typeof browser !== 'undefined' ? browser : chrome;

const DEFAULT_API_URL = 'http://localhost:3000';

/**
 * Get stored settings from browser.storage.local.
 * Safari iOS does not support storage.sync, so we use local.
 */
async function getSettings() {
  const result = await api.storage.local.get(['apiUrl', 'apiToken']);
  return {
    apiUrl: result.apiUrl || DEFAULT_API_URL,
    apiToken: result.apiToken || ''
  };
}

/**
 * POST an article visit to the backend API.
 */
async function logVisit(articleData) {
  const { apiUrl, apiToken } = await getSettings();

  if (!apiToken) {
    console.warn('[WikiTracker] No API token configured. Open the host app to set one.');
    return;
  }

  const url = `${apiUrl.replace(/\/+$/, '')}/api/visits`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        articleTitle: articleData.title,
        articleUrl: articleData.url,
        language: articleData.language
      })
    });

    if (!response.ok) {
      console.error(`[WikiTracker] API error: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.error('[WikiTracker] Failed to log visit:', err.message);
  }
}

// Listen for messages from content script
api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ARTICLE_VISITED') {
    logVisit(message.data);
  }
});

