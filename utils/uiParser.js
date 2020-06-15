// Extract commit info from the UI
var getUiInfo = async function({
    commitType
}, callback) {
    chrome.tabs.query({
            active: true,
            currentWindow: true
        },
        (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                commitType,
                server: SERVER
            }, (data) => {
                callback({
                    uiInfo: data
                });
            });
        });
}


// Parse url to get the commit info
function parseURL(url) {

    /** URL pattern in GitHub
     * new:	<SERVER>/<user>/<repo>/new/<branch>/<fpath>
     * edit:	<SERVER>/<user>/<repo>/edit/<branch>/<fpath>
     * delete:	<SERVER>/<user>/<repo>/delete/<branch>/<fpath>
     * upload:	<SERVER>/<user>/<repo>/upload/<branch>/<fpath>
     * merge:	<SERVER>/<user>/<repo>/pull/<pr#>
     **/

    /** URL pattern in GitLab
     * new:	<SERVER>/<user>/<repo>/-/new/<branch>/<fpath>
     * edit:	<SERVER>/<user>/<repo>/-/edit/<branch>/<fpath>
     * delete:	<SERVER>/<user>/<repo>/-/blob/<branch>/<fpath>
     * upload:	<SERVER>/<user>/<repo>/-/tree/<branch>/<fpath>
     * merge:	<SERVER>/<user>/<repo>/-/merge_requests/<pr#>
     **/

    let info = url.replace(`${SERVER}`, "").split("/");

    // The extension does not work on the main page of repo
    if (info.length < 4) {
        deactivate({
            rule: UNKNOWN_REQUEST
        });
        return UNKNOWN_REQUEST;
    }

    // Remove an extra element (i.e. "-") from the GitLab url
    if (SERVER == SERVER_GL) info.splice(3,1);

    let commitType = info[3];
    let baseBranch = null;
    let oldPath = null;
    let prId = null;
    let request = REQ_MERGE;

    if ((commitType == MERGE_GH) || (commitType == MERGE_GL)) {
        commitType = REQ_MERGE;
        prId = info[4];
    } else {
        // RULE: requests on non-commit pages are ignored
        request = checkRequest(commitType, url);
        if (request == UNKNOWN_REQUEST) {
            return request;
        }
        baseBranch = info[4];
        oldPath = getFilePath(url, commitType, baseBranch);

        // Unify D/U requests for GiHub and GitLab
        if (commitType == TYPE_BLOB) commitType = REQ_DELETE;
        if (commitType == TYPE_TREE) commitType = REQ_UPLOAD;
    }

    return {
        user: info[1],
        repo: info[2],
        baseBranch,
        commitType,
        request,
        oldPath,
        prId,
        url
    }
}


// Check if the request is unknown
function checkRequest(commitType, url) {
    switch (commitType) {
        case REQ_NEW:
        case REQ_EDIT:
        case REQ_DELETE: //GITHUB delete
        case REQ_UPLOAD: //GITHUB upload
            return REQ_REGULAR;

        case TYPE_BLOB: //GITLAB delete
        case TYPE_TREE: //GITLAB upload
            // TODO: Add more checks to make it more reliable
            if (SERVER == SERVER_GL) {
                return REQ_REGULAR;
            } else {
                deactivate({
                    rule: UNKNOWN_REQUEST
                });
                return UNKNOWN_REQUEST;
            }

        default:
            deactivate({
                rule: UNKNOWN_REQUEST
            });
            return UNKNOWN_REQUEST;
    }
}


// Parse url to get the file path
function getFilePath(url, commitType, baseBranch) {
    let fpath = url.split(commitType)[1];
    fpath = fpath.replace(`/${baseBranch}`, '');
    return fpath;
}


// Aggregate all file info
function getPathInfo(requestInfo) {
    let {
        commitType,
        oldPath,
        newPath
    } = requestInfo;

    // TODO: Validate the file path
    // Find out the file path validation function on GiHub and GitLab
    /*/ Validate the file path
    if (!validatePattern(REGEX_PATH, fpath)) {
        return errorHandler({
            msg: "Invalid file path!",
            err: true
        });
    }*/

    // trim path before comparision
    oldPath = trimSlash(oldPath);
    newPath = trimSlash(newPath);

    // get proper fpath and check for rename
    let rename = false;
    let fpath, oldParentDir;
    switch (commitType) {
        case REQ_DELETE:
            oldParentDir = getParentPath(oldPath);
            fpath = oldPath;
            break;

        case REQ_EDIT:
            oldParentDir = getParentPath(oldPath);
            fpath = newPath;
            if (oldPath != newPath) rename = true;
            break;

        case REQ_NEW:
            oldParentDir = oldPath;
            fpath = newPath;
            // GitLab does not display oldPath in the UI
            if (SERVER == SERVER_GL)
                fpath = `${oldPath}/${newPath}`;
            break;

        case REQ_UPLOAD:
            // TODO: Support multiple uploaded files on GitHub
            oldParentDir = oldPath;
            fpath = `${oldPath}/${newPath}`;
            break;
    }

    // trim path again
    fpath = trimSlash(fpath);

    // Extract proper fileName and parent directory 
    let fname = removeParentPath(fpath);
    let newParentDir = getParentPath(fpath);

    // Prepare a list of dirs that should be fetched from repo 
    let {
        dirs,
        newdirs,
        moved
    } = compareParentDirs(commitType, oldParentDir, newParentDir);

    return {
        dname: newParentDir,
        fname,
        dirs,
        newdirs,
	newPath: fpath,
        oldPath,
        rename
    };
}

// Compare old/new parent dirs
function compareParentDirs(commitType, oldParentDir, newParentDir) {
    var newdirs = [];
    var moved= false;

    let strcomp = findFirstDiffPos(oldParentDir, newParentDir);
    if (strcomp > -1) {
        // 1) Find new dirs
        newdirs = findNewDirs({
            commitType,
            newParentDir,
            oldParentDir
        });

        // 2) Find moved file
        //TODO: remove the following assumption to find a moved file
        // Assumption: the file is not moved to a different path
        //moved = newParentDir != oldParentDir ? true: false;
    }

    var dirs = getIntermediatePaths(`${oldParentDir}/`);
    //TODO: ignore newdirs as we do not fetch them from repo

    return {dirs, newdirs, moved};
}


// Check for new dirs
function findNewDirs({
    commitType,
    newParentDir,
    oldParentDir
}) {
    // No newdir is created through delete/upload operation
    if ((commitType == REQ_DELETE) || (commitType == REQ_UPLOAD))
        return [];

    // newdirs are differences between old and new parent dirs
    let diff = trimSlash(newParentDir.replace(oldParentDir, ""));
    return diff.split("/");
}
