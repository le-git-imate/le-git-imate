/**
 * Merge two blobs
 * base (taken from the ca)
 * f1 (taken from base branch)
 * f2 (taken from pr branch)
 */
function mergeTwoBlobs(base, f1, f2) {
    /*
     * Allocate the ArrayBuffer for each blob
     * uint16Array: two bytes for each char
     */
    let ancestor = strToBufferArray(base);
    let file1 = strToBufferArray(f1);
    let file2 = strToBufferArray(f2);

    let xmp = new Xmparam();
    xmp.level = XDL_MERGE_ZEALOUS_ALNUM;
    xmp.style = 0;
    xmp.favor = 0;
    xmp.xpp = 0;

    let result = {};

    let xdlmerge = xdl_merge(ancestor, file1, file2, xmp, result);

    return xdlmerge;
}


// Merge modified blobs
function mergeBlobs({
    blobs,
    parents
}) {
    let newBlobs = {}
    if (isEmpty(blobs))
        return newBlobs;

    let baseHead = parents.baseHead;
    let prHead = parents.prHead;
    let caHead = parents.hasOwnProperty("caHead") ?
        parents.caHead : baseHead;

    for (fpath in blobs) {
        let mergedBlob = mergeTwoBlobs(blobs[fpath][caHead],
            blobs[fpath][baseHead], blobs[fpath][prHead]);
        newBlobs[fpath] = createGitObject(TYPE_BLOB, mergedBlob);
    }

    return newBlobs;
}


// Merge the bottom tree
function mergeBottomTree({
    addedFiles,
    deletedFiles,
    modifiedFiles,
    newBlobs,
    baseTrees,
    prTrees
}) {
    let fpath, fname, parent;
    let newdirs = [];

    // Delete blobs
    if (deletedFiles.length > 0) {
        for (let i in deletedFiles) {
            // Find the parent tree in master
            fpath = deletedFiles[i];
            parent = getParentPath(fpath);
            fname = removeParentPath(fpath);

            // Update the parent tree in master
            delete baseTrees[parent][fname];
        }
    }

    // Add new blobs
    if (addedFiles.length > 0) {
        for (let i in addedFiles) {
            // Find the parent tree in PR
            fpath = addedFiles[i];
            parent = getParentPath(fpath);
            fname = removeParentPath(fpath);

            // Check for new subdir
            if (baseTrees[parent] !== undefined) {
                baseTrees[parent][fname] = prTrees[parent][fname];
            } else {
                let iPaths = getIntermediatePaths(parent);
                while (baseTrees[parent] === undefined) {
                    //keep track of new_dirs
                    newdirs.push(parent);
                    // Update master branch
                    baseTrees[parent] = prTrees[parent];
                    parent = iPaths.shift();
                }
            }
        }

    }

    // Merge blobs
    if (modifiedFiles.length > 0) {
        for (let i in modifiedFiles) {
            // Find the parent tree in master
            fpath = modifiedFiles[i];
            parent = getParentPath(fpath);
            fname = removeParentPath(fpath);
            // Update master branch
            baseTrees[parent][fname].id = newBlobs[fpath].id;
        }
    }

    return {
        baseTrees,
        newdirs
    };
}


// Propagate the update to the root tree
function propagateUpdate({
    dirs,
    baseTrees
}) {
    let objects = [];
    let treeHash, currentPath, currentTree, currentDir;
    while (dirs.length > 0) {

        // Get bottom path, dir, tree
        currentPath = dirs[0];
        currentDir = removeParentPath(currentPath)
        currentTree = getValues(baseTrees[currentPath])
        //FIXME: When the fpath contains word "new"
	// Add or a edit a fial fails,
	// since it cannot determine the path correctly

        // Sort the tree entry by entry names
        currentTree.sort(sortArrayByKey);

        // Compute the new tree hash		
        let obj = createGitObject(TYPE_TREE, currentTree);
        objects.push([TYPE_TREE, obj.object]);
        treeHash = obj.id;

        // Update the parent tree with the new hash of current tree
        if (currentPath != "") {
            let parent_dir = getParentPath(currentPath);
            baseTrees[parent_dir][currentDir].id = treeHash
        }

        // Remove the current dir and go for the upper level
        dirs.shift();
    }

    return ({
        treeHash,
        newTreeObjects: objects
    });
}
