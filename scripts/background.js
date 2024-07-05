// Listen for clicks on the extension icon
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked.');
    chrome.tabs.sendMessage(tab.id, { action: 'filterFiles' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error sending message to content script:', chrome.runtime.lastError);
        } else {
            console.log('Response from content script:', response);
        }
    });
});