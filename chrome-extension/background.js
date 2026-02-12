// Wikipedia Reading Tracker — Background Service Worker
// Receives article visit messages from content script and POSTs to the backend API.

'use strict';

const DEFAULT_API_URL = 'http://localhost:3000';

/**
 * Get stored settings from chrome.storage.sync.
 */
async function getSettings() {
  const result = await chrome.storage.sync.get(['apiUrl', 'apiToken']);
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
    console.warn('[WikiTracker] No API token configured. Open the extension popup to set one.');
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ARTICLE_VISITED') {
    logVisit(message.data);
  }
});

