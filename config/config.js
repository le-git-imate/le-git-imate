let AUTH;
let AUTHOR;
let REPO_API;
let REPO_URL;
let GROUP_GL;
let SERVER;


// Get the server type
function setServer(url) {
    if (url.startsWith(SERVER_GH)) {
        SERVER = SERVER_GH;
    } else if (url.startsWith(SERVER_GL)) {
        SERVER = SERVER_GL;
	GROUP_GL = url.replace(`${SERVER}`, "").split("/")[1]
    } else {
        deactivate({
            rule: UNKNOWN_SERVER
        });
        return UNKNOWN_SERVER;
    }
    return SERVER;
}


// Get basic info about the request
function setConfig({
    account,
    repo,
    server
}, callback) {

    let email;
    let {
        username,
        password,
        token
    } = account;

    if (server == SERVER_GH) { //GITHUB
        email = `${username}@${EMAIL_GH}`;
        REPO_API = `${API_GH}/repos/${username}/${repo}`;
        REPO_URL = `${SERVER}/${username}/${repo}`;
    } else { //GITLAB
        email = `${username}@${EMAIL_GL}`;
        REPO_API = `${API_GL}/projects`;
        //TODO: Remove the need of groups in GitLab
        REPO_URL = `${SERVER}/${GROUP_GL}/${repo}`;
    }

    AUTH = {
        username,
        password,
        token
    }

    AUTHOR = {
        name,
        email
    }    
}


// Check if the account info is available
function checkAccountInfo(callback) {
    let id = SERVER == SERVER_GH ? USER_GH : USER_GL;
    retrieveObject(id).then(
        (account) => {
            if (!account) {
                //TODO: check if the current user (from url) is added
                return errorHandler({
                    msg: `Account for the server \"${SERVER}\" is not set!`,
                    err: true
                });
            } else {
                callback(account);
            }
        });
}

