document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.getSelected(null, function(tab) {
        let url = tab.url;

        // Check for proper hosting server
        let server = setServer(url);
        if (server == UNKNOWN_SERVER) return;

        // Check for proper request
        let urlInfo = parseURL(url);
        if (urlInfo == UNKNOWN_REQUEST) return;

        // Check for account info
        checkAccountInfo((account) => {

            // Set basic config
            setConfig({
                account,
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
