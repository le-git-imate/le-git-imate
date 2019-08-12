// Create a sign commit object
function createSignedCommit({
        author,
        message,
        parents,
        treeHash
    },
    callback
) {
    let commit = formCommit({
        treeHash,
        author,
        parents,
        message
    });

    signContent(commit, (result) => {
        let signature = isolateSignature(result);
        callback(formSignedCommit(commit, signature));
    });
}


// Form the commit 
function formCommit({
    treeHash,
    author,
    parents,
    message
}) {
    let {
        timestamp,
        timezoneOffset
    } = determineTime();

    // First commit has no parent
    if (!parents) {
        parents = [];
    }

    let commit = {
        tree: treeHash,
        parent: parents,
        author: {
            name: author.name,
            email: author.email,
            timestamp: timestamp,
            timezoneOffset: timezoneOffset
        },
        message
    };

    return `${formCommitHeaders(commit)}\n${normalize(commit.message)}`;
}


// Form the commit header
function formCommitHeaders(commit) {

    let headers = '';

    if (commit.tree) headers += `${TYPE_TREE} ${commit.tree}\n`;
    else headers += `${TYPE_TREE} ${NULL_TREE}\n`; //null tree

    // Check if the commit has parent(s)
    if (commit.parent && commit.parent.length) {
        for (let p of commit.parent) {
            headers += 'parent';
            headers += ' ' + p + '\n';
        }
    }

    let author = commit.author;
    headers += `author ${author.name} <${author.email}> ${author.timestamp} ${formatTimezoneOffset(author.timezoneOffset)}\n`;

    // Committer and author of GUI commits are the same
    let committer = commit.committer || commit.author;
    headers += `committer ${committer.name} <${committer.email}> ${committer.timestamp} ${formatTimezoneOffset(committer.timezoneOffset)}\n`;

    return headers;
}


// Form signed commit
function formSignedCommit(commit, signature) {

    let headers = comHeader(commit);
    let message = comMessage(commit);

    signature = normalize(signature);
    let signedCommit = `${headers}\n${PGP_SIG}${indent(signature)}\n${message}`;

    return signedCommit
}


// Extract the commit's signature
function isolateSignature(commit) {

    // Take the last signature as the commit signature
    // TODO: Make sure it does not go wrong
    let signature = commit.slice(
        commit.lastIndexOf(`${PGP_START}`),
        commit.lastIndexOf(`${PGP_END}`) +
        `${PGP_END}`.length
    )

    return outdent(signature)
}


// Get commit message
function comMessage(commit) {
    return normalize(commit.slice(commit.indexOf('\n\n') + 2))
}


// Get commit header
function comHeader(commit) {
    return commit.slice(0, commit.indexOf('\n\n'))
}
