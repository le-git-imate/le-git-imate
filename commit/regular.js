// Performa a regular commit
function doRegular({
    fileInfo,
    requestInfo,
    treeHash
}, callback) {
    // Display diff
    displayDiff(requestInfo, fileInfo);

    let dirs = fileInfo.dirs;
    let {
        baseBranch,
        commitType,
        fileContent
    } = requestInfo;

    //TODO: Take care of move operation properly 
    // e.g., mv d1/d2/d3/f1 to d1/d6/f2
    //TODO: Create new dir on GitLab 

    // Fetch trees
    fetchTrees({
            branch: baseBranch,
            dirs,
            treeHash
        },
        ({
            trees
        }) => {
            // Update the bottom tree
            let {
                baseTrees,
                objects
            } = updateBottomTree({
                baseTrees: trees,
                commitType,
                fileContent,
                fileInfo
            });

            callback({
                dirs,
                baseTrees,
                objects
            })
        });
}


//Fetch involved trees 
function fetchTrees({
    branch,
    dirs,
    treeHash
}, callback) {

    //GitHub: get trees by id
    if (SERVER == SERVER_GH) {
        getTreeContent({
                treeHash,
                dirs
            },
            ({
                trees
            }) => {
                callback({
                    trees
                });
            });
    } //GitLab: get trees by path
    else {
        let urls = treeUrls_GL(branch, dirs);
        multiFetch({
                urls,
                parser: treeParser_GL
            },
            ({
                data
            }) => {
                callback({
                    trees: data[branch]
                });
            });
    }
}
