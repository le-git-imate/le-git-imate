//TODO: Show proper messages if request is not authorized!

// Make a single API call
var singleAPICall = function({
    endpoint,
    json
}, callback) {
    var request = new XMLHttpRequest();
    request.onload = function() {
        //jsonify the response unless users not ask
        let response = json == false ? this.responseText :
            JSON.parse(this.responseText);
        callback({
            endpoint,
            response
        });
    };

    request.open('get', endpoint, true);
    if (SERVER == SERVER_GH)
        request.setRequestHeader('Authorization', `token ${AUTH.token}`);
    //request.setRequestHeader('Authorization', `Bearer ${AUTH.token}`)//GITLAB
    request.send();
}

// Make multiple API calls 
var multipleAPICall = function({
    urls,
    json
}, callbackMulti) {
    var data = {};
    for (var i = 0; i < urls.length; i++) {
        var callback = ({
            endpoint,
            response
        }) => {
            data[endpoint] = response;
            var size = 0;
            for (var index in data) {
                if (data.hasOwnProperty(index))
                    size++;
            }

            if (size == urls.length) {
                callbackMulti(data);
            }
        };
        singleAPICall({
            endpoint: urls[i],
            json
        }, callback);
    }
}


// Fetch data from multiple endpoints at once
var multiFetch = function({
    urls,
    parser,
    json
}, callback) {
    var data = {};
    if (urls.length < 1)
        callback({
            data
        });

    var mutliCallback = function(res) {
        for (var item in res) {
            parser({
                item,
                info: res[item],
                data
            });
        }
        callback({
            data
        });
    };

    multipleAPICall({
        urls,
        json
    }, mutliCallback);
}


// Get the group id
// TODO: Support commits even though the repo is not under a group
function getGroupID(callback) {
    let endpoint = `${API_GL}/groups?private_token=${AUTH.token}`;
    singleAPICall({
        endpoint
    }, ({
        response
    }) => {
        callback({
            groupId: response[0].id
        });
    });
}


// Get the group's repo id
function getGroupRepoID({
    groupId,
    repo
}, callback) {
    let endpoint = `${API_GL}/groups/${groupId}/projects/?search=${repo}`;
    singleAPICall({
        endpoint
    }, ({
        response
    }) => {
        callback({
            repoId: response[0].id
        });
    });
}


// Compare the head of a branch
function getBranchHead({
    branch
}, callback) {
    let endpoint = `${REPO_API}/branches/${branch}`;
    singleAPICall({
        endpoint
    }, ({
        response
    }) => {
        callback({
            baseInfo: response
        });
    });
}


// Compare branches in a merge request
function compareBranches({
    baseBranch,
    prBranch
}, callback) {
    let endpoint = `${REPO_API}/compare?from=${baseBranch}&to=${prBranch}`;
    singleAPICall({
        endpoint
    }, ({
        response
    }) => {
        callback({
            mergeInfo: response
        });
    });
}

// Compare the head of a branch
function getBranchHead_GH({
    branch
}, callback) {

    let endpoint = `${REPO_API}/branches/${branch}`;
    singleAPICall({
        endpoint
    }, ({
        response
    }) => {
        callback({
            branchInfo: response.commit
        });
    });
}


// Compare base and pr branches
function compareBranches_GH({
    baseBranch,
    prBranch
}, callback) {
    /**
     * Note: On GitHub, there is no need to compare branches by heads
     * GitHub does not allow to create two PRs for a branch at the same time
     * So by simply comparing the branch names, we get all info about the PR
     */

    // TODO: Make any branch comparisons possbile 
    // CompareBranch API only include a comparison of up to 250 commits	

    let endpoint = `${REPO_API}/compare/${baseBranch}...${prBranch}`;
    singleAPICall({
        endpoint
    }, ({
        response
    }) => {
        callback({
            mergeInfo: response
        });
    });
}



// Get the involved trees in a merge commit
function getTrees({
    treeIds
}, callback) {

    let urls = treeUrls(Object.keys(treeIds));
    // Fetch tree contents for PR and base branch
    multiFetch({
        urls,
        parser: treeParser_GH
    }, ({
        data
    }) => {
        callback(data);
    });

}


// Get the tree content of a branch
function getTreeContent({
    branch,
    dirs,
    treeHash
}, callback) {

    /*
     * Form dir urls invovled in the commit
     * First, get corresponding treeIds
     * Each id is searched in the parent dirs
     * e.g.: corresponding treeId of ./d1/d2 is in tree entries of ./d1
     * Thus, we ignore the last dir in dirs
     */
    let parentdirs = dirs.slice(0, dirs.length - 1)
    let urls = formDirUrls({baseBranch: branch, dirs: parentdirs});

    // Get treeIds that need to be fetched 
    multiFetch({
        urls,
        parser: dirParser
    }, ({
        data
    }) => {
	let treeIds = {};
	if (Object.keys(data).length > 0){
        	treeIds = formTreeIdUrls(dirs, branch, data[branch]);
	}

        // Add root level treeIds
        treeIds[treeHash] = {
            ref: branch,
            path: ""
        };

        // Get the needed trees per branch
        getTrees({
            treeIds
        }, (data) => {
            let {
                btrees
            } = mapTrees({
                baseBranch:branch,
                treeIds,
                data
            });

            callback({
                trees: btrees
            });
        });
    });

}


/*/ Get the tree content of a branch
function getTreeContent({
    dirs,
    treeHash
}, callback) {
    let btrees = {};

    // Form tree ids, keep track of branch and directory
    let treeIds = {
        base: {
            [treeHash]: ""
        }
    }

    // Get dir levels, ignore the root level at last index
    dirs.pop();
    let dirLevels = getDirLevels(dirs);
    // Get list on involved levels. TODO: Is sort needed?
    let levels = Object.keys(dirLevels).sort();
    getTrees({
        dirLevels,
        levels,
        treeIds,
        btrees
    }, ({
        btrees
    }) => {
        callback({
            trees: btrees
        });
    });
}


// Get the involved trees in a regular commit
function getTrees({
    dirLevels,
    levels,
    treeIds,
    btrees
}, callback) {
    // Get first level treeIds
    let urls = formTreeUrls(treeIds);

    // Fetch tree contents for PR and base branch
    multiFetch({
        urls,
        parser: treeParser_GH
    }, ({
        data
    }) => {
        // Add corresponding trees for the current level
        let baseTrees = getTreesInLevel({
            ids: treeIds.base,
            data
        })
        btrees = {
            ...btrees,
            ...baseTrees
        };

        // Check if there is dirs not fetched
        if (levels.length > 0) {
            //Set current level
            let cl = levels[0];
            levels.shift();

            treeIds.base = getTreeIds(dirLevels[cl], btrees);
            getTrees({
                treeIds,
                dirLevels,
                levels,
                btrees
            }, callback);
        } else {
            callback({
                btrees
            });
        }
    });
}*/


// Get the GitLab user info
function getUserInfo_GL(username, callback) {

    let endpoint = `${API_GL}/users?username=${username}`;
    singleAPICall({
        endpoint
    }, ({
        response
    }) => {
        callback({
            name: response[0].name
        });
    });
}


// Get the GitHub user info
function getUserInfo(username, callback) {

    let endpoint = `${API_GH}/users/${username}`;
    singleAPICall({
        endpoint
    }, ({
        response
    }) => {
        callback({
            name: response.name
        })
    });
}
