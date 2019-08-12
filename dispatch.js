// TODO: Remove global variables
var COMMITBOX_ID = "commitBox";
var finalObjects = [];
var commitInfo;


// Perform the request regarding the server type
function performRequest({
    requestInfo
}) {
    /** TODO: CHECK IF IT IS COMMITTABLE
     * There are some situations in which the extension could be run while the COMMIT is not ready
     *  - 1) delete a file on GitLab
     *     - A file is ready to be deleted if the commit message text area exists
     *  - 2) closed merge: there is no green merge button
     *  - 3) merge conflicts: there is no green merge button
     */

    let branch = requestInfo.baseBranch;
    switch (SERVER) {
        case SERVER_GL:
            getGroupID(({
                groupId
            }) => {
                // get repo info
                getGroupRepoID({
                    groupId,
                    repo: requestInfo.repo
                }, ({
                    repoId
                }) => {
                    // update REPO_API
                    REPO_API = `${REPO_API}/${repoId}/repository`;

                    getBranchHead({
                        branch
                    }, ({
                        baseInfo
                    }) => {
                        // unify parent info with github
                        baseInfo.sha = baseInfo.commit.id
                        // prepare the new commit
                        prepareCommit({
                            baseInfo,
                            requestInfo,
                            runner: gitlabRunner
                        });
                    });
                });

            });
            break;

        case SERVER_GH:
            getBranchHead_GH({
                branch
            }, ({
                branchInfo
            }) => {
                // prepare the new commit
                prepareCommit({
                    baseInfo: branchInfo,
                    requestInfo,
                    runner: githubRunner,
                    treeHash: branchInfo.commit.tree.sha
                });
            });
            break;
        default:
    }
}


// Prepare the new commit
function prepareCommit({
    requestInfo,
    baseInfo,
    runner,
    treeHash
}) {
    // Populate the popup window with parent info
    setParentInfo(baseInfo.commit);

    // Cache objects and branch temporarily to use them later
    commitInfo = requestInfo;

    let branch = requestInfo.baseBranch;
    let message = requestInfo.commitMessage;
    if (requestInfo.request == REQ_MERGE) {
        // Perform regular commit
        doMerge({
                requestInfo,
                baseInfo,
                runner
            },
            ({
                dirs,
                baseTrees,
                objects,
                parents
            }) => {
                // Create new commit and packfile
                createCommit({
                    branch,
                    baseTrees,
                    dirs,
                    message,
                    objects,
                    parents
                });
            });
    } else {
        // Get necessary finle info for regular commit    
        let fileInfo = getPathInfo(requestInfo);
        // Cache objects and branch temporarily to use them later
        commitInfo = {
            ...commitInfo,
            ...fileInfo
        };

        // Perform regular commit
        doRegular({
                fileInfo,
                requestInfo,
                treeHash
            },
            ({
                dirs,
                baseTrees,
                objects
            }) => {
                // Create new commit and packfile
                createCommit({
                    branch,
                    baseTrees,
                    dirs,
                    message,
                    objects,
                    parents: [baseInfo.sha]
                });
            });
    }
}


// Compute new commit 
function createCommit({
    branch,
    baseTrees,
    dirs,
    message,
    objects,
    parents
}) {

    // Propagate the update to get new root tree hash
    let {
        treeHash,
        newTreeObjects
    } = propagateUpdate({
        dirs,
        baseTrees
    });

    // Cache objects temporarily to use them later
    finalObjects = [...objects, ...newTreeObjects];

    createSignedCommit({
        author: AUTHOR,
        message,
        parents,
        treeHash
    }, (commit) => {
        // Populate the pop up window, and make it readable only
        document.getElementById(COMMITBOX_ID).value = commit;
        document.getElementById(COMMITBOX_ID).readOnly = true;
    });
}


function pushCommit() {
    // Get the signed commit from pop-up window
    // NOTE: Make it un-editable
    var commit = document.getElementById(COMMITBOX_ID).value;
    var type = TYPE_COMMIT;
    var binary = createGitObject(type, commit);
    var newHead = binary.id
    finalObjects.push([type, binary.object]);

    //call send-pack process and then parse the server response
    sendPackLine({
            auth: AUTH,
            branch: commitInfo.baseBranch,
            repo_url: REPO_URL,
            newHead,
            objects: finalObjects
        },
        (result) => {
            // Depending on the server response
            // Reload the page or display error
            if (parsePostResponse(result)){
		pageRefresh(commitInfo);
            } else{
		return errorHandler({
                    msg: `Commit failed!\n${response}`,
                    err: true
                });
            }
        }
    );
}
