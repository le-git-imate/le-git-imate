function deactivate({
    rule
}) {
    let message;
    switch (rule) {
        case UNKNOWN_SERVER:
            message = `The le-git-imate extension works only on GitHub and GitLab!`;
            break;

        case UNKNOWN_REQUEST:
            message = `The le-git-imate extension works only on commit pages.`;
            break;

        case REQ_UPLOAD:
            message = `The le-git-imate extension does not support upload commits on GitLab!.`;
            break;

        case MERGE_CONFLICT:
            message = `Please resolve merge conflicts and try again.`;
            break;

        case MERGE_CLOSED:
            message = `The merge request is already closed.`;
            break;
    }

    window.alert(message); window.close();
}


function setParentInfo(commit) {

    let parentInfo = '';

    if (SERVER == SERVER_GH) {
        parentInfo += `author: ${commit.author.name} <${commit.author.email}>\n`;
        parentInfo += `committer: ${commit.committer.name} <${commit.committer.email}>\n`;
        parentInfo += `date: ${standardizeTime(commit.author.date)}\n`;
    } else {
        parentInfo += `author: ${commit.author_name} <${commit.author_email}>\n`;
        parentInfo += `committer: ${commit.committer_name} <${commit.committer_email}>\n`;
        parentInfo += `date: ${standardizeTime(commit.authored_date)}\n`;
    }
    parentInfo += `message: ${commit.message}\n`;

    document.getElementById('parent_info').value = parentInfo;
}
