document.getElementById('bankruptcy-btn').addEventListener('click', async () => {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'declareBankruptcy' });
    if (response.success) {
      window.close();
    }
  } catch (error) {
    console.error('Bankruptcy failed:', error);
  }
});
