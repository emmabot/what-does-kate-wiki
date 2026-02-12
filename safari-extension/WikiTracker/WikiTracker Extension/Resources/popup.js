// Wikipedia Reading Tracker — Popup Script (Safari)
// Manages settings UI for the Safari extension popup.

'use strict';

const api = typeof browser !== 'undefined' ? browser : chrome;
const DEFAULT_API_URL = 'http://localhost:3000';

const apiUrlInput = document.getElementById('apiUrl');
const apiTokenInput = document.getElementById('apiToken');
const saveBtn = document.getElementById('saveBtn');
const testBtn = document.getElementById('testBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const messageEl = document.getElementById('message');

function showMessage(text, type = 'info') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  setTimeout(() => { messageEl.className = 'message hidden'; }, 3000);
}

function setStatus(state, text) {
  statusDot.className = `status-dot ${state}`;
  statusText.textContent = text;
}

async function loadSettings() {
  const result = await api.storage.local.get(['apiUrl', 'apiToken']);
  apiUrlInput.value = result.apiUrl || DEFAULT_API_URL;
  apiTokenInput.value = result.apiToken || '';
  if (result.apiToken) {
    setStatus('pending', 'Configured — tap Test to verify');
  } else {
    setStatus('disconnected', 'Not configured');
  }
}

async function saveSettings() {
  const apiUrl = apiUrlInput.value.trim() || DEFAULT_API_URL;
  const apiToken = apiTokenInput.value.trim();
  await api.storage.local.set({ apiUrl, apiToken });
  apiUrlInput.value = apiUrl;
  if (apiToken) {
    setStatus('pending', 'Saved — tap Test to verify');
  } else {
    setStatus('disconnected', 'Not configured');
  }
  showMessage('Settings saved!', 'success');
}

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
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });
    if (response.ok) {
      setStatus('connected', 'Connected ✓');
      showMessage('Connection successful!', 'success');
    } else if (response.status === 401) {
      setStatus('error', 'Error — invalid token');
      showMessage('Invalid API token.', 'error');
    } else {
      setStatus('error', `Error — HTTP ${response.status}`);
      showMessage(`Server returned ${response.status}`, 'error');
    }
  } catch (err) {
    setStatus('error', 'Error — cannot reach server');
    showMessage(`Connection failed: ${err.message}`, 'error');
  } finally {
    testBtn.disabled = false;
  }
}

saveBtn.addEventListener('click', saveSettings);
testBtn.addEventListener('click', testConnection);
loadSettings();

