// we use glob-to-regex.
// original code: https://cdn.jsdelivr.net/npm/glob-to-regexp@0.4.1/index.min.js
// the above code is meant for NodeJS. it was modified by ChatGPT (GPT-4o) to support chrome extensions.

// TODO: add 2 new buttons when clicking on filter symbol:
//       1. filter with debug mode: set variable debug=True and print every pattern.
//       2. add `about` page which redirects to the extension's download link.

// fetch the CODEOWNERS file content
async function getCodeOwners() {
    console.log('Fetching CODEOWNERS file content...');
    try {
        // Extract the base branch from the PR page
        const baseBranchElement = document.querySelector('.base-ref');
        let baseBranch = 'master';
        if (baseBranchElement) {
            baseBranch = baseBranchElement.textContent.trim();
            console.log('got the following base branch:', baseBranch);
        } else {
            console.log('could not get base branch. defaulting to master.');
        }

        // Construct the raw URL.
        let rawURL = window.location.href.replace(/\/pull\/.*$/, `/${baseBranch}/.github/CODEOWNERS`);
        
        if (window.location.href.includes('cto-github.cisco.com')) {
            rawURL = window.location.href.replace(/\/pull\/.*$/, `/raw/${baseBranch}/.github/CODEOWNERS`);
        } else {
            rawURL = rawURL.replace('github.com', 'raw.githubusercontent.com');
        }

        console.log("full CODEOWNERS raw path:", rawURL);
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
        if (!filenameElement) {
          console.log('Could not get filenameElement.');
          return;
        }
        
        let filenameSubElement = null;
        for (let i = 0; i < filenameElement.childNodes.length; i++) {
            if (filenameElement.childNodes[i].className === "Link--primary Truncate-text") {
              filenameSubElement = filenameElement.childNodes[i];
              break;
            }        
        }

        if (!filenameSubElement) {
          console.log('Could not get filenameSubElement.');
          return;
        }

        // Get the title attribute from the .Truncate element
        const filename = filenameSubElement.getAttribute('title');
        if (!filename) {
          console.log('Could not get filename.');
          return;
        }

        const hasCodeOwners = checkCodeOwners(filename, codeOwnersContent);

        if (hasCodeOwners) {
            // hide the file row.
            console.log('Hiding file which has code owners:', filename);
            row.closest('.js-details-container').style.display = 'none';
        } else {
            console.log('File does not have code owners:', filename);
        }
    });
}

// check if a file has a code owner
function checkCodeOwners(filename, codeOwnersContent) {
    console.log('Checking code owners for file:', filename);
    // Split CODEOWNERS content into lines
    const codeOwnersLines = codeOwnersContent.split('\n');
    
    let matched = false;
    let hasOwner = false;
    
    // Iterate through each line to find matching pattern
    for (let i = 0; i < codeOwnersLines.length; i++) {
        let line = codeOwnersLines[i].trim();
        if (line === '' || line.startsWith('#')) {
            // Skip empty lines and comments
            continue; 
        }
        
        // Split each line by whitespace to get pattern and owners
        let [pattern, ...owners] = line.split(/\s+/);

        // Handle inline comments
        const commentIndex = pattern.indexOf('#');
        if (commentIndex > -1) {
            pattern = pattern.substring(0, commentIndex).trim();
        }

        if (pattern === '') {
            continue;
        }

        // Check if the filename matches any pattern
        const regex = convertGlobToRegExp(pattern);
        console.log('testing regex:', regex);

        if (regex.test(filename)) {
            matched = true;
            console.log('Match found:', line);
            console.log('regex:', regex);
            console.log("file owners:", owners);
            if (owners.length > 0) {
                hasOwner = true;
            } else {
                hasOwner = false;
            }
        }
    }

    // Return true if matched and has owner, or if matched and does not have owner (to support later match)
    return matched && hasOwner;
}

// Convert a glob pattern to a regular expression
function convertGlobToRegExp(glob) {
    let regexString = "(^|/)";
    let inGroup = false;
    let escapeNext = false;

    for (let char of glob) {
        if (escapeNext) {
            regexString += "\\" + char;
            escapeNext = false;
        } else {
            switch (char) {
                case '\\':
                    escapeNext = true;
                    break;
                case '*':
                    regexString += ".*";
                    break;
                case '?':
                    regexString += ".";
                    break;
                case '{':
                    inGroup = true;
                    regexString += "(";
                    break;
                case '}':
                    inGroup = false;
                    regexString += ")";
                    break;
                case ',':
                    regexString += inGroup ? "|" : ",";
                    break;
                default:
                    regexString += char;
            }
        }
    }

    // Allow for matching both directories and files within directories
    if (!regexString.endsWith("/")) {
        regexString += "(?:$|/.*$)";
    } else {
        regexString += ".*$";
    }

    return new RegExp(regexString);
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'filterFiles') {
        filterFiles().then(() => sendResponse({status: 'filtering started'}));
        // Indicates that the response is asynchronous.
        return true;
    }
});
