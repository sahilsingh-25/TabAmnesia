// TabAmnesia Background Service 
// Quarantined tabs are automatically deleted after 48 hours to prevent
// stale data from accumulating. The cleanup runs every hour via chrome.alarms.

const AUTO_DELETE_INTERVAL_HOURS = 1;
const MAX_AGE_MS = 48 * 60 * 60 * 1000; 


chrome.runtime.onInstalled.addListener(() => {
  console.log('TabAmnesia installed');

  
  chrome.alarms.create('quarantineCleanup', {
    periodInMinutes: AUTO_DELETE_INTERVAL_HOURS * 60 
  });
});


chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'quarantineCleanup') {
    cleanupExpiredTabs();
  }
});

async function cleanupExpiredTabs() {
  const result = await chrome.storage.local.get(['quarantinedTabs']);
  const tabs = result.quarantinedTabs || [];

  const now = Date.now(); 

  const remainingTabs = tabs.filter(tab => {
    const ageMs = now - tab.timestamp;
    return ageMs <= MAX_AGE_MS;
  });

  // Only save if we removed any tabs
  if (remainingTabs.length < tabs.length) {
    const removedCount = tabs.length - remainingTabs.length;
    console.log(`Quarantine cleanup: removed ${removedCount} expired tab(s)`);
    await chrome.storage.local.set({ quarantinedTabs: remainingTabs });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'declareBankruptcy') {
    handleBankruptcy(sendResponse);
    return true; 
  }
});

async function handleBankruptcy(sendResponse) {
  try {
    
    const allTabs = await chrome.tabs.query({ currentWindow: true });
    
    const tabsToQuarantine = allTabs.filter(tab => {
    
      if (tab.pinned) return false;

      if (tab.audible) return false;

      if (!tab.url) return false;
      if (tab.url.includes('docs.google.com') || tab.url.includes('figma.com')) return false;

      return true;
    });

    const quarantinedData = tabsToQuarantine.map(tab => ({
      url: tab.url,
      title: tab.title,
      timestamp: Date.now()
    }));


    await chrome.storage.local.set({ quarantinedTabs: quarantinedData });

    const tabIds = tabsToQuarantine.map(tab => tab.id);
    if (tabIds.length > 0) {
      await chrome.tabs.remove(tabIds);
    }

    const successUrl = chrome.runtime.getURL('success.html');
    await chrome.tabs.create({ url: successUrl });

    sendResponse({ success: true });
  } catch (error) {
    console.error('Bankruptcy error:', error);
    sendResponse({ success: false, error: error.message });
  }
}
