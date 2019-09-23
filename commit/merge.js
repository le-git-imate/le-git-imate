// Merge two branches
function doMerge({
    requestInfo,
    baseInfo,
    runner
}, callback) {
    let {
        baseBranch,
        prBranch
    } = requestInfo;

    // Call the proper runner to perform basic operations
    runner({
        baseBranch,
        prBranch,
        baseInfo
    }, ({
        dirs,
        parents,
        blobs,
        btrees,
        ptrees,
        addedFiles,
        deletedFiles,
        modifiedFiles
    }) => {
        // Create new blobs for modified files
        let newBlobs = mergeBlobs({
            blobs,
            parents
        });

        // Update the bottom tree
        let {
            baseTrees,
            newdirs
        } = mergeBottomTree({
            addedFiles,
            deletedFiles,
            modifiedFiles,
            newBlobs,
            baseTrees: btrees,
            prTrees: ptrees
        });

        // Prepare new blob/tree objects that appear in the packfile
        let objects = [];
        for (blob in newBlobs) {
            objects.push([TYPE_BLOB, newBlobs[blob].object]);
        }

        // Remove newdirs before starting propagateUpdate process
        //  - They are already added during mergeBottomTree process
        // Reverse dirs list, to start from the bottom tree
        dirs = arrayDifference(dirs, newdirs);
        dirs.reverse();

        callback({
            dirs,
            baseTrees,
            objects,
            parents: [parents.baseHead, parents.prHead]
        });
    });
}


// Perform a gitlab merge
function gitlabRunner({
    baseBranch,
    prBranch,
    baseInfo
}, callback) {

    //Compare two branches
    compareBranches({
        baseBranch,
        prBranch
    }, ({
        mergeInfo
    }) => {

        // FIXME: Take car of mergediff=[]
        // When a user creates a PR with several commits,
	// and at the end nothing has changes or diff = []

        // Differentiate changed blobs
        let {
            addedFiles,
            deletedFiles,
            modifiedFiles
        } =
        differentiateBlobs_GL(mergeInfo.diffs);

        // Find involved directories in the merge commit
        let paths = addedFiles.concat(deletedFiles, modifiedFiles);
        let dirs = getCommonDirs(paths);

        // Form parents
        let {
            parents
        } = formParents_GL({
            baseInfo,
            mergeInfo
        });

        // Form urls for trees need to be fetched
        let {
            urls
        } = formTreeUrls_GL(baseBranch, prBranch, dirs);

        // Fetch modified trees
        multiFetch({
            urls,
            parser: treeParser_GL
        }, ({
            data
        }) => {
            let btrees = data[baseBranch];
            let ptrees = data[prBranch];

            // Fetch modified blobs
            urls = formBlobUrls(parents, modifiedFiles);
            multiFetch({
                    urls,
                    parser: blobParser,
                    json: false
                },
                ({
                    data
                }) => {
                    callback({
                        dirs,
                        parents,
                        btrees,
                        ptrees,
                        blobs: data,
                        addedFiles,
                        deletedFiles,
                        modifiedFiles
                    });
                });
        });
    });
}


// Perform a github merge
function githubRunner({
    baseBranch,
    prBranch
}, callback) {

    // Get info about the pr branch. Later we use it for tree hash
    getBranchHead_GH({
        branch: prBranch
    }, ({
        branchInfo
    }) => {

        // Compare two branches 
        compareBranches_GH({
            baseBranch,
            prBranch
        }, ({
            mergeInfo
        }) => {

            // Differentiate changed blobs
            let {
                addedFiles,
                deletedFiles,
                modifiedFiles
            } =
            differentiateBlobs_GH(mergeInfo.files);

            // Find involved directories in the merge commit
            let paths = addedFiles.concat(deletedFiles, modifiedFiles);
            let dirs = getCommonDirs(paths);

            // Form parents
            let {
                parents
            } = formParents_GH({
                mergeInfo
            });

            /*
             * Form dir urls invovled in the commit
             * First, get corresponding treeIds
             * Each id is searched in the parent dirs
             * e.g.: corresponding treeId of ./d1/d2 is in tree entries of ./d1
             * Thus, we ignore the last dir in dirs
             */
            let parentdirs = dirs.slice(0, dirs.length - 1)
            let urls = formDirUrls(baseBranch, prBranch, parentdirs);

            // Get treeIds that need to be fetched 
            multiFetch({
                urls,
                parser: dirParser
            }, ({
                data
            }) => {
                let baseIds = formTreeIdUrls(dirs, baseBranch, data[baseBranch]);
                let prIds = formTreeIdUrls(dirs, prBranch, data[prBranch]);
                treeIds = {
                    ...baseIds,
                    ...prIds
                }

                // Add root level treeIds
                treeIds[mergeInfo.base_commit.commit.tree.sha] = {
                    ref: baseBranch,
                    path: ""
                };
                treeIds[branchInfo.commit.tree.sha] = {
                    ref: prBranch,
                    path: ""
                };

                // Get the needed trees per branch
                getMergeTrees({
                    treeIds
                }, (data) => {
                    let {
                        btrees,
                        ptrees
                    } = mapTrees({baseBranch, prBranch, treeIds, data});

                    // Fetch modified blobs
                    urls = formBlobUrls(parents, modifiedFiles);
                    multiFetch({
                            urls,
                            parser: blobParser
                        },
                        ({
                            data
                        }) => {
                            callback({
                                dirs,
                                parents,
                                btrees,
                                ptrees,
                                blobs: data,
                                addedFiles,
                                deletedFiles,
                                modifiedFiles
                            });
                        });
                });
            });
        });
    });
}


/**
* Differentiate blobs for gitlab request:
* - added
* - deleted
* - modified
**/
function differentiateBlobs_GL(blobs) {

    let addedFiles = [];
    let deletedFiles = [];
    let modifiedFiles = [];

    // Compare blob lables
    for (let i = 0; i < blobs.length; i++) {

        if (blobs[i].deleted_file == true) {
            deletedFiles.push(blobs[i].new_path);
        } else if (blobs[i].new_file == true) {
            addedFiles.push(blobs[i].new_path);
        } else if (blobs[i].renamed_file == true) {
            // In case of rename:
            // Replace it in base with the one from PR
            deletedFiles.push(blobs[i].old_path);
            addedFiles.push(blobs[i].new_path);

        } else {
            modifiedFiles.push(blobs[i].new_path);
        }
    }

    return {
        addedFiles,
        deletedFiles,
        modifiedFiles
    }
}

/**
* Differentiate blobs for github request:
* - added
* - deleted
* - modified
**/
function differentiateBlobs_GH (blobs){

    let addedFiles = [];
    let deletedFiles = [];
    let modifiedFiles = [];

    // Compare blob lables
    for (let i = 0; i < blobs.length; i++) {

        if (blobs[i].status == "removed") {
            deletedFiles.push(blobs[i].filename);
        } else if (blobs[i].status == "added") {
            addedFiles.push(blobs[i].filename);
        } else if (blobs[i].status == "renamed") {
            // In case of rename:
            // Replace it in base with the one from PR
            deletedFiles.push(blobs[i].previous_filename);
            addedFiles.push(blobs[i].filename);
        } else {
            modifiedFiles.push(blobs[i].filename);
        }

    }

    return {
        addedFiles,
        deletedFiles,
        modifiedFiles
    }
}
