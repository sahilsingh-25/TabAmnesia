// Quarantine Zone Dashboard

document.addEventListener('DOMContentLoaded', loadQuarantinedTabs);

// Keywords are matched against URLs and titles (case-insensitive) to categorize
// quarantined tabs into meaningful groups.

const CATEGORY_KEYWORDS = {
  'Work': ['github', 'docs', 'jira', 'slack'],
  'Media': ['youtube', 'netflix', 'spotify']
  // Any tab not matching Work or Media falls into 'General'
};

async function loadQuarantinedTabs() {
  const result = await chrome.storage.local.get(['quarantinedTabs']);
  const tabs = result.quarantinedTabs || [];

  updateCount(tabs.length);
  renderTabs(tabs);
}

function updateCount(count) {
  document.getElementById('count').textContent = count;

  const emptyState = document.getElementById('empty-state');
  const tabsContainer = document.getElementById('tabs-container');

  if (count === 0) {
    emptyState.classList.remove('hidden');
    tabsContainer.innerHTML = '';
  } else {
    emptyState.classList.add('hidden');
  }
}


function categorizeTabs(tabs) {
  const categories = {
    'Work': [],
    'Media': [],
    'General': []
  };

  tabs.forEach((tab, originalIndex) => {
    const category = categorizeTab(tab);
    // Store the tab along with its original index for restore functionality
    categories[category].push({ ...tab, originalIndex });
  });

  return categories;
}


function categorizeTab(tab) {
  const searchText = `${tab.url} ${tab.title}`.toLowerCase();

  // Check Work keywords first
  for (const keyword of CATEGORY_KEYWORDS['Work']) {
    if (searchText.includes(keyword)) {
      return 'Work';
    }
  }

  // Check Media keywords
  for (const keyword of CATEGORY_KEYWORDS['Media']) {
    if (searchText.includes(keyword)) {
      return 'Media';
    }
  }

  // Default to General if no keywords match
  return 'General';
}

function renderTabs(tabs) {
  const container = document.getElementById('tabs-container');
  const categories = categorizeTabs(tabs);

  // Build HTML for each category section
  let html = '';

  for (const [categoryName, categoryTabs] of Object.entries(categories)) {
    if (categoryTabs.length === 0) continue;

    html += `
      <div class="mb-6">
        <h2 class="text-lg font-semibold text-gray-300 mb-3 flex items-center">
          <span class="w-2 h-2 rounded-full mr-2 ${getCategoryColor(categoryName)}"></span>
          ${categoryName}
          <span class="ml-2 text-sm text-gray-500">(${categoryTabs.length})</span>
        </h2>
        <div class="space-y-3">
          ${categoryTabs.map(tab => renderTabCard(tab)).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  container.querySelectorAll('.restore-btn').forEach(btn => {
    btn.addEventListener('click', handleRestore);
  });
}

// Get the accent color class for a category header.
function getCategoryColor(category) {
  switch (category) {
    case 'Work': return 'bg-blue-500';
    case 'Media': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
}

// Render a single tab card HTML
function renderTabCard(tab) {
  return `
    <div class="bg-gray-800 rounded-lg p-4 flex items-center justify-between hover:bg-gray-750 transition-colors">
      <div class="flex-1 min-w-0 mr-4">
        <h3 class="font-medium text-gray-100 truncate" title="${escapeHtml(tab.title)}">
          ${escapeHtml(tab.title)}
        </h3>
        <p class="text-sm text-gray-500 truncate mt-1" title="${escapeHtml(tab.url)}">
          ${truncateUrl(tab.url)}
        </p>
      </div>
      <button
        data-original-index="${tab.originalIndex}"
        data-url="${escapeHtml(tab.url)}"
        class="restore-btn px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
      >
        Restore
      </button>
    </div>
  `;
}

function handleRestore(event) {
  const btn = event.currentTarget;
  const url = btn.dataset.url;
  const originalIndex = parseInt(btn.dataset.originalIndex, 10);

  // Open the tab
  chrome.tabs.create({ url }, async () => {
    // Remove from quarantine after successful creation
    await removeFromQuarantine(originalIndex);
  });
}

async function removeFromQuarantine(originalIndex) {
  const result = await chrome.storage.local.get(['quarantinedTabs']);
  const tabs = result.quarantinedTabs || [];

  // Remove the tab at the original index
  tabs.splice(originalIndex, 1);

  // Update storage
  await chrome.storage.local.set({ quarantinedTabs: tabs });

  // Re-render the list
  loadQuarantinedTabs();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncateUrl(url, maxLength = 50) {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength) + '...';
}
