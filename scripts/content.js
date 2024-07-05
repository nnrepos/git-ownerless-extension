// we use glob-to-regex.
// original code: https://cdn.jsdelivr.net/npm/glob-to-regexp@0.4.1/index.min.js
// the above code is meant for NodeJS. it was modified by ChatGPT (GPT-4o) to support chrome extensions.

// fetch the CODEOWNERS file content
async function getCodeOwners() {
    console.log('Fetching CODEOWNERS file content...');
    try {
        // Extract the base branch from the PR page
        const baseBranchElement = document.querySelector('.base-ref');
        var baseBranch = null;
        if (baseBranchElement){
            baseBranch = baseBranchElement.textContent.trim();
            console.log('got the following base branch:', baseBranch)
        }else{
            baseBranch = 'master';
            console.log('could not get base branch. defaulting to master.')
        }
        
        // Use the base branch in the raw URL
        const rawURL = window.location.href.replace(/\/pull\/.*$/, `/${baseBranch}/.github/CODEOWNERS`)
                                            .replace('github.com', 'raw.githubusercontent.com');
        const response = await fetch(rawURL);

        // Fetch the CODEOWNERS file content from GitHub
        if (response.ok) {
            console.log('Successfully fetched CODEOWNERS file.');
            return await response.text();
        } else {
            console.log('Failed to fetch CODEOWNERS file:', response.statusText);
            return null;
        }
    } catch (error) {
        console.error('Error fetching CODEOWNERS file:', error);
        return null;
    }
}

// filter files based on code owners
async function filterFiles() {
    console.log('Filtering files...');
    
    // Get the CODEOWNERS file content
    const codeOwnersContent = await getCodeOwners();
    console.log('CODEOWNERS file content:', codeOwnersContent);
    
    if (!codeOwnersContent) {
        console.log('Failed to fetch CODEOWNERS file content.');
        return;
    }

    // Get all file rows
    const fileRows = document.querySelectorAll('.file-info');
    console.log('Found', fileRows.length, 'file rows.');

    // Loop through each file row
    fileRows.forEach(row => {
        // Get the filename element from .Truncate within .file-info
        const filenameElement = row.querySelector('.file-info .Truncate');
        if (!filenameElement){
          console.log('Could not get filenameElement.');
          return;
        }
        
        var filenameSubElement = null;
        for (var i = 0; i < filenameElement.childNodes.length; i++) {
            if (filenameElement.childNodes[i].className == "Link--primary Truncate-text") {
              filenameSubElement = filenameElement.childNodes[i];
              break;
            }        
        }

        if (!filenameSubElement){
          console.log('Could not get filenameSubElement.');
          return;
        }

        // Get the title attribute from the .Truncate element
        const filename = filenameSubElement.getAttribute('title');
        if (!filename){
          console.log('Could not get filename.');
          return;
        }

        console.log('Checking file:', filename);
        const hasCodeOwner = checkCodeOwner(filename, codeOwnersContent);

        if (hasCodeOwner) {
            // hide the file row.
            console.log('Hiding file which has code owners:', filename);
            row.closest('.js-details-container').style.display = 'none';
        } else {
            console.log('File does not have code owners:', filename);
        }
    });
}

// check if a file has a code owner
function checkCodeOwner(filename, codeOwnersContent) {
    console.log('Checking code owner for file:', filename);
    // Split CODEOWNERS content into lines
    const codeOwnersLines = codeOwnersContent.split('\n');
    
    // Iterate through each line to find matching pattern
    for (let i = 0; i < codeOwnersLines.length; i++) {
        const line = codeOwnersLines[i].trim();
        if (line === '' || line.startsWith('#')) {
            // Skip empty lines and comments
            console.log("skipping empty line", i);
            continue; 
        }
        
        // Split each line by whitespace to get pattern and owners
        const [pattern, ...owners] = line.split(/\s+/);

        // Check if the filename matches any pattern
        const regex = globToRegex(pattern, { extended: true });
        console.log("testing pattern", regex);

        if (regex.test(filename)) {
            // If the file matches a pattern, it might have a code owner.
            console.log('Match found:', line);
            console.log("file owners:", owners)
            if (owners.length > 0){
                return true;
            }
        }
    }

    // If no match found, the file doesn't have a code owner
    console.log('No match found for file:', filename);
    return false;
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'filterFiles') {
        filterFiles().then(() => sendResponse({status: 'filtering started'}));
        return true; // Indicates that the response is asynchronous
    }
});
