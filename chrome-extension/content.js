// Wikipedia Reading Tracker — Content Script
// Detects Wikipedia article visits and sends them to the background service worker.

(function () {
  'use strict';

  // Non-article page prefixes to filter out
  const NON_ARTICLE_PREFIXES = [
    'Special:',
    'Talk:',
    'User:',
    'Wikipedia:',
    'Help:',
    'Category:',
    'Portal:',
    'Template:',
    'Main_Page'
  ];

  /**
   * Check if the current page is a real Wikipedia article (not a special page).
   */
  function isArticlePage() {
    const path = window.location.pathname;
    // Extract the part after /wiki/
    const wikiPath = path.replace(/^\/wiki\//, '');

    for (const prefix of NON_ARTICLE_PREFIXES) {
      if (wikiPath === prefix || wikiPath.startsWith(prefix)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract the article title from document.title.
   * Wikipedia titles follow the pattern: "Article Name - Wikipedia"
   */
  function extractTitle() {
    const title = document.title;
    const suffix = ' - Wikipedia';
    if (title.endsWith(suffix)) {
      return title.slice(0, -suffix.length);
    }
    return title;
  }

  /**
   * Detect the language edition from the hostname.
   * e.g., en.wikipedia.org → "en", fr.wikipedia.org → "fr"
   */
  function detectLanguage() {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts[1] === 'wikipedia') {
      return parts[0];
    }
    return 'en';
  }

  // Only proceed if this is an actual article page
  if (!isArticlePage()) {
    return;
  }

  const articleData = {
    title: extractTitle(),
    url: window.location.href,
    language: detectLanguage()
  };

  // Send to background service worker
  chrome.runtime.sendMessage({
    type: 'ARTICLE_VISITED',
    data: articleData
  });
})();

