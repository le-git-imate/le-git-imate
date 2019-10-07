document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.getSelected(null, function(tab) {
        let url = tab.url;

        // Check for proper hosting server
        let server = setServer(url);
        if (server == UNKNOWN_SERVER) return;

        // Check for proper request
        let urlInfo = parseURL(url);
        if (urlInfo == UNKNOWN_REQUEST) return;

        // Check for the account info
	let username = urlInfo.user
        checkAccountInfo({
            username: urlInfo.user
        }, (credentials) => {
            // Set basic config
            setConfig({
                username,
                credentials,
                repo: urlInfo.repo,
                server
            }, () => {
                // Call content script to gather UI info
                let commitType = urlInfo.commitType;
                getUiInfo({
                    commitType
                }, ({
                    uiInfo
                }) => {
                    let requestInfo = {
                        ...urlInfo,
                        ...uiInfo
                    };

                    // Perform the request
                    performRequest({
                        requestInfo
                    });
                });
            });
        });
    });

    // Push new commit to the server
    let push_commit = document.getElementById('push_commit')
    if (push_commit) addEventListener('click', pushCommit);
});
