// Refresh the page after peforming the request
function pageRefresh(commitInfo) {
    let url = updateURL(commitInfo);
    reload(url);
}


// reload the page 
function reload(url) {
    chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.executeScript(tab.id, {
            code: 'window.location.replace("url");'.replace("url", url)
        });
    });
}


// reload the page 
function updateURL(commitInfo) {
    /**
     * Depending on the request, SERVER will go to a different page
     * e.g., after a edit request, users will be redirected to
     * <REPO_URL>/edit/<branch>/<fpath>
     **/

    let {
        url,
        commitType,
    } = commitInfo;	

    //merge: return the same url
    if (commitType == REQ_MERGE) {
        // TODO: GitLab itself waits for a sec or so
        // We should simulate that delay
	return url;
    } else {//regular: redirect url
        let fname = removeParentPath(commitInfo.oldPath);
        //edit 
        if (commitType == REQ_EDIT) {
            // TODO: Check for new dirs or new parent
            url = url.replace(`/${REQ_EDIT}/`, `/${TYPE_BLOB}/`);
            if (commitInfo.rename) {
                url = url.replace(`${commitInfo.oldPath}`, `${commitInfo.newPath}`)
            }
            return url;
        }
        //new
        else if (commitType == REQ_NEW) {
            // TODO: Check for new dirs or new parent
            if (SERVER == SERVER_GH) {
                return url.replace(`/${REQ_NEW}/`, `/${TYPE_TREE}/`)
            } else {
                url = url.replace(`/${REQ_NEW}/`, `/${TYPE_BLOB}/`);
                return url.replace(`${commitInfo.oldPath}`, `${commitInfo.newPath}`);
            }
        }
        //delete
        else if (commitType == REQ_DELETE) {
            // FIXME: Fix issue with deleted dirs
            if (SERVER == SERVER_GH) {
                url = url.replace(`/${REQ_DELETE}/`, `/${TYPE_TREE}/`);
            } else {
                url = url.replace(`/${TYPE_BLOB}/`, `/${TYPE_TREE}/`);
            }
            return url.replace(`/${fname}`, "");
        }
        //upload
        else if (commitType == REQ_UPLOAD) {
            if (SERVER == SERVER_GH) {
                return REPO_URL;
            } else {
                url = url.replace(`/${TYPE_TREE}/`, `/${TYPE_BLOB}/`);
                return `${url}/${fname}`;
            }
        }
    }
}
