chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'filterDebug',
        title: 'Filter with Debug Mode',
        contexts: ['action']
    });

    chrome.contextMenus.create({
        id: 'about',
        title: 'About',
        contexts: ['action']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'filterDebug') {
        chrome.tabs.sendMessage(tab.id, { action: 'filterFilesDebug' });
    } else if (info.menuItemId === 'about') {
        chrome.tabs.create({ url: 'https://github.com/nnrepos/git-ownerless-extension' });
    }
});

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
