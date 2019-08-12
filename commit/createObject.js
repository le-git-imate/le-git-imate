// Get new commit/blob/tree objects
function createGitObject(type, content) {
    //normalize the blob content
    if (type == TYPE_BLOB)
        content = normalize(content)

    let object;
    if (type == TYPE_TREE)
        object = treeObject(content)
    else {
        object = createBuffer(content)
    }

    //wrap object into buffer
    let wrap = objectWrap(type, object)

    //compress and write file
    let compress = compressObject(wrap)

    //object hash
    let hash = getObjectHash(wrap)
    return {
        object: object,
        id: hash
    }
}


// Get object hash
function getObjectHash(object) {
    var hash = sha1.create();
    hash.update(object);

    return hash.hex();
}
