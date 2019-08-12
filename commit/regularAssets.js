// Update the bottom tree
function updateBottomTree({
    baseTrees,
    commitType,
    fileContent,
    fileInfo
}) {
    let action;
    switch (commitType) {
        case REQ_DELETE:
            action = deleteBlob;
            break;

        case REQ_EDIT:
            action = modifyBlob;
            break;

        case REQ_NEW:
            action = addBlob;
            break;

        case REQ_UPLOAD: //TODO: Support uploading several files
            action = addBlob;
            break;
    }

    return action({
        fileContent,
        fileInfo,
        baseTrees
    });
}


// Delete a blob
function deleteBlob({
    baseTrees,
    fileInfo
}) {
    // Check for deleted dirs
    let {
        dirs,
        deletedPath
    } = findDeletedTree(fileInfo.dirs, baseTrees);

    // Delete the file from bottom tree if no dir is deleted
    // Otherwise, remove the toppest deleted dir from trees
    let deleted, parent;
    if (!deletedPath) { // Case 1: parent dir should be deleted
        deleted = fileInfo.fname;
        parent = fileInfo.dname;
    } else { // Case 2: no dir is deleted
        deleted = removeParentPath(deletedPath);
        parent = getParentPath(deletedPath);
    }

    // Update bottom tree
    delete baseTrees[parent][deleted];

    return {
        baseTrees,
        objects: []
    }; // no GitObject is created
}


// Edit a blob
function modifyBlob({
    baseTrees,
    fileInfo,
    fileContent
}) {
    let {
        dirs,
        newdirs,
        fname,
        rename,
        oldPath
    } = fileInfo;

    let objects = [];
    let bottom = dirs[0];

    // FIXME: remove the file from previous path
    // TODO: Make sure new dir does not exist on the repo
    // TODO: Check if file is already exists
    // CASE 1: new dir is created
    if (newdirs.length > 0) { // Case 1: new_dir is created
        //Create new blob object 
        let {
            entry,
            binary
        } = addEntry({
            mode: MODE_BLOB,
            type: TYPE_BLOB,
            name: fname,
            content: fileContent
        });
        objects.push([TYPE_BLOB, binary]);

        //Create tree for newdirs 
        let {
            dname,
            treeEntry,
            binaries
        } = addSubTrees(newdirs, entry);

        objects = [...objects, ...binaries];

        // delete old file
        let oldDir = getParentPath(oldPath); 
        let oldName = removeParentPath(oldPath);
        delete baseTrees[oldDir][oldName];

        // Update bottom tree
        baseTrees[bottom][dname] = treeEntry;

        // CASE 2: new dir is not created
    } else {
        let obj = createGitObject(TYPE_BLOB, fileContent);
        objects.push([TYPE_BLOB, obj.object]);

        //TODO: CASE 3: file is moved

        // CASE 4: file is renamed
        if (rename) {
            let oldName = removeParentPath(oldPath);

            //TODO: Update the following with key rename
            baseTrees[bottom][fname] = baseTrees[bottom][oldName];
            delete baseTrees[bottom][oldName];
            baseTrees[bottom][fname].name = fname
        }

        // Update bottom tree
        baseTrees[bottom][fname].id = obj.id;
    }

    return {
        baseTrees,
        objects
    };}


// Add a new blob
function addBlob({
    baseTrees,
    fileInfo,
    fileContent
}) {
    let {
        dirs,
        newdirs,
        fname
    } = fileInfo;

    // Create new blob object
    let {
        entry,
        binary
    } = addEntry({
        mode: MODE_BLOB,
        type: TYPE_BLOB,
        name: fname,
        content: fileContent
    });
    let objects = [];
    objects.push([TYPE_BLOB, binary]);

    //TODO: check if file/dir already exists
    let bottom = dirs[0];

    // Check if there is new dir
    if (newdirs.length > 0) { // Case 1: new_dir is added
        let {
            dname,
            treeEntry,
            binaries
        } = addSubTrees(newdirs, entry);

        objects = [...objects, ...binaries];

        // Update bottom tree
        baseTrees[bottom][dname] = treeEntry;
    } else { // Case 2: no new_dir is created
        baseTrees[bottom][fname] = entry;
    }

    return {
        baseTrees,
        objects
    };
}


// Check for deleted parent dirs
function findDeletedTree(dirs, baseTrees) {

    /*
     * If a file deletion results in an empty directory
     * delete the corresponding tree
     * root tree can be empty
     */
    let deletedPath;
    if (dirs.length > 1) {
        let i = 0;
        //TODO: repalce this "while" with an alternative (similar to isEmpty)
        while (Object.keys(baseTrees[dirs[i]]).length == 1) {
            deletedPath = dirs[i];
            i++;
        }
        // remove deleted dirs from the list
        dirs.splice(0, i);
    }

    return {
        dirs,
        deletedPath
    };
}


// Create Git tree objects for an array of dirs 
function addSubTrees(newdirs, treeEntry) {

    let dir;
    let objects = [];
    while (newdirs.length > 0) {
        dir = newdirs.pop();
        let {
            entry,
            binary
        } = addEntry({
            mode: MODE_TREE,
            type: TYPE_TREE,
            name: dir,
            content: [treeEntry]
        });
        treeEntry = entry;
        objects.push([TYPE_TREE, binary]);
    }

    return {
        dname: dir,
        treeEntry,
        binaries: objects
    }
}


// Create a new Git blob/tree entry 
function addEntry({
    mode,
    type,
    name,
    content
}) {

    let obj = createGitObject(type, content);
    let entry = {
        mode,
        type,
        id: obj.id,
        name
    };

    return {
        entry,
        binary: obj.object
    };
}
