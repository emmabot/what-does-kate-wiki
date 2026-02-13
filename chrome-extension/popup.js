// Wikipedia Reading Tracker — Popup Script
// Manages settings UI: API URL, token, save, test connection, status display.

'use strict';

const DEFAULT_API_URL = 'https://what-does-kate-wiki-production.up.railway.app';

const apiUrlInput = document.getElementById('apiUrl');
const apiTokenInput = document.getElementById('apiToken');
const saveBtn = document.getElementById('saveBtn');
const testBtn = document.getElementById('testBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const messageEl = document.getElementById('message');

/**
 * Show a temporary message to the user.
 */
function showMessage(text, type = 'info') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  setTimeout(() => {
    messageEl.className = 'message hidden';
  }, 3000);
}

/**
 * Update the status indicator.
 */
function setStatus(state, text) {
  statusDot.className = `status-dot ${state}`;
  statusText.textContent = text;
}

/**
 * Load saved settings from chrome.storage.sync.
 */
async function loadSettings() {
  const result = await chrome.storage.sync.get(['apiUrl', 'apiToken']);
  apiUrlInput.value = result.apiUrl || DEFAULT_API_URL;
  apiTokenInput.value = result.apiToken || '';

  if (result.apiToken) {
    setStatus('pending', 'Configured — click Test to verify');
  } else {
    setStatus('disconnected', 'Not configured');
  }
}

/**
 * Save settings to chrome.storage.sync.
 */
async function saveSettings() {
  const apiUrl = apiUrlInput.value.trim() || DEFAULT_API_URL;
  const apiToken = apiTokenInput.value.trim();

  await chrome.storage.sync.set({ apiUrl, apiToken });

  apiUrlInput.value = apiUrl;

  if (apiToken) {
    setStatus('pending', 'Saved — click Test to verify');
  } else {
    setStatus('disconnected', 'Not configured');
  }

  showMessage('Settings saved!', 'success');
}

/**
 * Test the connection by calling GET /api/visits with the stored token.
 */
async function testConnection() {
  const apiUrl = apiUrlInput.value.trim() || DEFAULT_API_URL;
  const apiToken = apiTokenInput.value.trim();

  if (!apiToken) {
    setStatus('disconnected', 'Not configured');
    showMessage('Please enter an API token first.', 'error');
    return;
  }

  setStatus('pending', 'Testing...');
  testBtn.disabled = true;

  try {
    const url = `${apiUrl.replace(/\/+$/, '')}/api/visits`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });

    if (response.ok) {
      setStatus('connected', 'Connected ✓');
      showMessage('Connection successful!', 'success');
    } else if (response.status === 401) {
      setStatus('error', 'Error — invalid token');
      showMessage('Invalid API token.', 'error');
    } else {
      setStatus('error', `Error — HTTP ${response.status}`);
      showMessage(`Server returned ${response.status} ${response.statusText}`, 'error');
    }
  } catch (err) {
    setStatus('error', 'Error — cannot reach server');
    showMessage(`Connection failed: ${err.message}`, 'error');
  } finally {
    testBtn.disabled = false;
  }
}

// Event listeners
saveBtn.addEventListener('click', saveSettings);
testBtn.addEventListener('click', testConnection);

// Load settings on popup open
loadSettings();

