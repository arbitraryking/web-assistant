// Popup script for PagePilot
// This popup acts as an intermediate step to preserve user gesture context

document.addEventListener('DOMContentLoaded', async () => {
  const openSidePanelBtn = document.getElementById('openSidePanel');
  const closePopupBtn = document.getElementById('closePopup');
  const selectedTextDiv = document.getElementById('selectedText');
  const selectedTextContent = document.getElementById('selectedTextContent');
  const messageParagraph = document.getElementById('message');

  // Check if there's selected text from the floating button
  const result = await chrome.storage.session.get(['selectedText', 'selectedTextUrl', 'selectedTextTitle']);

  if (result.selectedText) {
    // Show selected text
    selectedTextDiv?.classList.remove('hidden');
    if (selectedTextContent) {
      selectedTextContent.textContent = result.selectedText;
    }
    if (messageParagraph) {
      messageParagraph.textContent = 'Click the button below to open the side panel and ask questions about the selected text.';
    }
  } else {
    // No selected text, update message
    if (messageParagraph) {
      messageParagraph.textContent = 'Click the button below to open the side panel.';
    }
  }

  // Open side panel button - this is a legitimate user gesture
  openSidePanelBtn?.addEventListener('click', async () => {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab.id) {
        // If there's selected text, ensure it's stored for side panel to pick up
        if (result.selectedText) {
          await chrome.storage.session.set({
            selectedText: result.selectedText,
            selectedTextUrl: result.selectedTextUrl || tab.url,
            selectedTextTitle: result.selectedTextTitle || tab.title,
            pendingTextTransfer: true // Flag to indicate pending transfer
          });
        }

        // Open side panel (works because button click = user gesture)
        await chrome.sidePanel.open({ tabId: tab.id });

        // Don't clear storage here - let side panel consume it
        // Side panel will clear it after reading
      }

      // Close popup automatically
      window.close();
    } catch (error) {
      console.error('Error opening side panel:', error);
      alert('Failed to open side panel. Please try again.');
    }
  });

  // Close popup button
  closePopupBtn?.addEventListener('click', () => {
    window.close();
  });
});
