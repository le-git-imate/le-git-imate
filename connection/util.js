// Form parent ids
function formParents_GL({
    baseInfo,
    mergeInfo
}) {

    //TODO: what if pr has two CAs
    let caHead = mergeInfo.commits[0].parent_ids[0];
    let parents = {
        baseHead: baseInfo.commit.id,
        prHead: mergeInfo.commit.id
    }

    if (parents.baseHead !== caHead)
        parents["caHead"] = caHead

    return ({
        parents
    })
}


// Form parent ids
function formParents_GH({
    mergeInfo
}) {

    //TODO: what if pr has two CAs
    let caHead = mergeInfo.merge_base_commit.sha;
    let parents = {
        baseHead: mergeInfo.base_commit.sha,
        prHead: mergeInfo.commits.pop().sha
    };

    if (parents.baseHead !== caHead)
        parents["caHead"] = caHead

    return ({
        parents
    })
}


// Form urls for trees need to be fetched (GitLab)
function formTreeUrls_GL(baseBranch, prBranch, dirs) {
    /**
     * To create the merge commit, we need only trees of base and pr
     * No need to get the tree of common ancestor
     * In case of GitLab, we get trees for changed dirs
     **/

    let trees = {
        base: treeUrls_GL(baseBranch, dirs),
        pr: treeUrls_GL(prBranch, dirs),
    }

    return {
        urls: [...trees.base, ...trees.pr]
    }
}


// Form tree API URLs per branch (GitLab)
function treeUrls_GL(branch, dirs) {
    let urls = [];
    let endpoint = `${REPO_API}/tree?ref=${branch}&path=`;
    for (dir of dirs) {
        urls.push(`${endpoint}${trimPath(dir)}`);
    }

    return urls;
}


// Extract the fpath and ref name of fetched trees
function treeParser_GL({
    item,
    info,
    data
}) {

    let key = extractBetween(item, "?ref=", "&path=");
    let ref = untrimPath(extractAfter(item, "&path="));

    // Initialize sub-object, otherwise you'll get errors
    if (key in data == false) {
        data[key] = {};
    }

    data[key][ref] = formTreeEntries_GL(info);
}


//Form retrieved tree entries (GitLab)
function formTreeEntries_GL(entries) {
    let trees = {};
    for (let entry of entries) {
        // Omit the first char of the tree mode
        let mode = entry.mode;
        entry.mode = mode == "040000" ? "40000" : mode;
        trees[entry.name] = entry;
    }

    return trees;
}


// Form urls for trees need to be fetched (GitHub)
function formDirUrls({baseBranch, prBranch, dirs}) {
    let trees = dirUrls(baseBranch, dirs)
    //Check for pr branch
    if (prBranch !== undefined)
	trees = [...trees, ...dirUrls(prBranch, dirs)];

    return trees;
}


function dirUrls(branch, dirs) {
    let urls = [];
    let endpoint = `${REPO_API}/contents`;
    for (let dir of dirs) {
        urls.push(`${endpoint}/${dir}?ref=${branch}`);
    }

    return urls;
}


// Extract the fpath and ref name of fetched trees
function dirParser({
    item,
    info,
    data
}) {
    //Check if info is Non-Array, means it is Not found
    if (info.constructor !== Array)
        return;
    //Check if info has at least one entry
    if (info.length < 1)
        return;

    let ref = extractAfter(item, "?ref=");
    let dpath = extractBetween(item, "/contents/", "?ref=");
    if (ref in data == false) {
        data[ref] = {};
    }

    //data [ref][dpath] = formTreeIdEntries(info);
    data[ref] = {
        ...data[ref],
        ...formDirEntries(info)
    };
}


// Form treeId urls
function formTreeIdUrls(dirs, branch, info) {
    let ids = {};
    for (let dir of dirs) {
        if (info.hasOwnProperty(dir)) {
            // Assumption: Git Objects are uniq:)
            ids[info[dir].sha] = {
                ref: branch,
                path: dir
            };
        }
    }

    return ids;
}


// Extract the fpath and ref name of fetched trees
function treeParser_GH({
    info,
    data
}) {
    data[info.sha] = info.tree;
}


function mapTrees({
    baseBranch,
    prBranch,
    treeIds,
    data
}) {
    let trees = {
        [baseBranch]: {}
    };

    // In case of regular commit, we define an empty prBranch
    // TODO: Make it better
    if (prBranch !== undefined)
        trees[prBranch] = {}
    else
        prBranch = "Not defined";

    for (let id in treeIds) {
        let {
            ref,
            path
        } = treeIds[id];
        trees[ref][path] = formTreeEntries(data[id]);
    }

    return {
        btrees: trees[baseBranch],
        ptrees: trees[prBranch]
    }
}


// Form retrieved tree entries (GitHub)
function formDirEntries(entries) {
    let trees = {};
    for (let entry of entries) {
        //let name = entry.name;
        let path = entry.path;
        trees[path] = entry;
    }

    return trees;
}


// Form retrieved tree entries (GitHub)
function formTreeEntries(entries) {
    let trees = {}
    for (let entry of entries) {

        // Omit the first char of the tree mode
	let mode = entry.mode;
	entry.mode = mode == "040000" ? "40000" : mode;

	//TODO: Make entry names consistent with GitLab
        // Rename sha with id
        entry["id"] = entry.sha;
        delete entry["sha"];

        // Rename path with name
        let path = entry.path;;
        entry["name"] = path;
        delete entry["path"];

        trees[path] = entry;
    }

    return trees;
}


// Form urls for trees need to be fetched (GitLab)
function formTreeUrls(treeIds) {
    let ids = Object.keys(treeIds.base);
    if (treeIds.hasOwnProperty("pr"))
        ids = [...ids, ...Object.keys(treeIds.pr)];

    return treeUrls(ids);
}


// Form tree API URLs per branch (GitHub)
function treeUrls(ids) {
    // TODO: Handle truncated trees
    let urls = [];
    if (ids.length == 0)
        return urls;

    let endpoint = `${REPO_API}/git/trees`;
    for (let id of ids) {
        urls.push(`${endpoint}/${id}`);
    }

    return urls;
}


// Get all trees in one level (GitHub)
function getTreesInLevel({
    ids,
    data
}) {
    let trees = {}
    for (let id of Object.keys(ids)) {
        trees = {
            ...trees,
            ...formTreeEntries(ids[id], data[id])
        };
    }

    return trees;
}


// Get corresponding treeId for a directory (GitHub)
function getTreeIds(dirs, trees) {
    let treeIds = {};
    for (let dpath of dirs) {
        let parent = getParentPath(dpath);
        let dir = removeParentPath(dpath);
        if (trees[parent].hasOwnProperty(dir)) {
            // Assume that Git Objects are uniq:)
            treeIds[trees[parent][dir].id] = dpath;
            //treeIds[dir] = trees[parent][dir].id;
        }
    }

    return treeIds
}


// Form urls for all files need to be fetched 
function formBlobUrls(parents, blobs) {

    // If baseHead and caHead are not the same, fetch files for caHead
    let caRefs = []
    if (parents.hasOwnProperty("caHead"))
        caRefs = fileUrls(parents.caHead, blobs)
    let baseRefs = fileUrls(parents.baseHead, blobs)
    let prRefs = fileUrls(parents.prHead, blobs)

    return [...baseRefs, ...prRefs, ...caRefs]
}


// Form file Endpoints for a remote ref
function fileUrls(ref, files) {

    let urls = [];
    if (SERVER == SERVER_GL) {
        let endpoint = `${REPO_API}/files/`;
        for (file of files) {
            urls.push(`${endpoint}${trimPath(file)}/raw?ref=${ref}`);
        }
    }
    if (SERVER == SERVER_GH) {
        let endpoint = `${REPO_API}/contents/`;
        for (file of files) {
            urls.push(`${endpoint}${file}?ref=${ref}`);
        }
    }
    return urls;
}

// Extract the fpath and ref name of fetched blobs
function blobParser({
    item,
    info,
    data
}) {

    let result;
    if (SERVER == SERVER_GL)
        result = blob_GL({
            item,
            info,
            data
        });
    if (SERVER == SERVER_GH)
        result = blob_GH({
            item,
            info,
            data
        });

    let {
        key,
        ref,
        content
    } = result;
    // Initialize sub-object
    if (key in data == false) {
        data[key] = {};
    }
    data[key][ref] = content; //TODO: Make a return
}


// Extract the fpath and ref name of fetched blobs
function blob_GL({
    item,
    info
}) {

    let key = untrimPath(extractBetween(item, "/files/", "/raw?"));
    let ref = extractAfter(item, "?ref=");

    return {
        key,
        ref,
        content: info
    }
}


// Extract the fpath and ref name of fetched blobs
function blob_GH({
    item,
    info
}) {

    let key = info.path;
    let ref = extractAfter(info.url, "?ref=");

    return {
        key,
        ref,
        content: atob(info.content)
    }
}
