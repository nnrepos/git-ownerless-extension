// TODOniv: make button prettier.
// TODOniv: test more codeowner patterns.
// TODOniv: get github path from user.

// Function to add a custom button
function addButton() {
    // Check if the button already exists
    if (document.getElementById('customButton')) {
        console.log('Button already exists.');
        return;
    }

    // Create a new button element
    const button = document.createElement('button');
    button.id = 'customButton';
    button.textContent = 'Filter'; // Less text

    // Add styles to make the button smaller and round
    button.style.padding = '5px 10px';
    button.style.borderRadius = '50%'; // Round button
    button.style.fontSize = '12px';
    button.style.cursor = 'pointer';
    button.style.backgroundColor = '#0366d6'; // GitHub button color
    button.style.color = 'white';
    button.style.border = 'none';

    console.log('Button created.');

    // Add a click event listener to the button
    button.addEventListener('click', () => {
        console.log('Button clicked.');
        filterFiles();
    });

    // Find the appropriate place to insert the button
    const targetDiv = document.querySelector('div.hide-sm.hide-md'); // Select the div with the exact class

    if (targetDiv) {
        console.log('Inserting button after div with class "hide-sm hide-md".');
        targetDiv.parentNode.insertBefore(button, targetDiv.nextSibling);
    } else {
        console.log('Failed to find div with class "hide-sm hide-md" to insert button after.');
    }
}

// Function to fetch the CODEOWNERS file content
async function getCodeOwners() {
    console.log('Fetching CODEOWNERS file content...');
    try {
        // Use regex to replace everything after '/pull/'
        // TODOniv: get base branch from PR base in active page.
        const rawURL = window.location.href.replace(/\/pull\/.*$/, '/master/.github/CODEOWNERS')
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

// Function to filter files based on code owners
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

        // Check if the file has a code owner
        const hasCodeOwner = checkCodeOwner(filename, codeOwnersContent);

        if (!hasCodeOwner) {
            // If there's no code owner, hide the file row
            console.log('Hiding file without a code owner:', filename);
            row.closest('.js-details-container').style.display = 'none';
        } else {
            console.log('File has a code owner:', filename);
        }
    });
}


// Function to check if a file has a code owner
function checkCodeOwner(filename, codeOwnersContent) {
    console.log('Checking code owner for file:', filename);
    // Split CODEOWNERS content into lines
    const codeOwnersLines = codeOwnersContent.split('\n');
    
    // Iterate through each line to find matching patterns
    for (let i = 0; i < codeOwnersLines.length; i++) {
        const line = codeOwnersLines[i].trim();
        if (line === '' || line.startsWith('#')) continue; // Skip empty lines and comments
        
        // Split each line by whitespace to get patterns and owners
        const [patterns, ...owners] = line.split(/\s+/);

        // Check if the filename matches any pattern
        if (patterns.split(/\s+/).some(pattern => new RegExp(pattern).test(filename))) {
            // If the file matches a pattern, it has a code owner
            console.log('Match found:', line);
            return true;
        }
    }

    // If no match found, the file doesn't have a code owner
    console.log('No match found for file:', filename);
    return false;
}

// Check if we are on a GitHub PR files page
if (window.location.href.includes('github.com') && window.location.href.includes('/pull/')) {
    console.log('On GitHub PR files page.');
    if (document.readyState !== 'loading') {
      addButton();
    } else {      
      // Add the button when the page is loaded
      document.addEventListener('DOMContentLoaded', addButton);
    }
    
    // Re-add the button when navigating through different tabs in the PR page
    document.addEventListener('pjax:end', addButton);
} else {
    console.log('Not on GitHub PR files page.');
}
