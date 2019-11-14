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

    let {
        username,
        password,
        token
    } = account;

    let caller = getUserInfo;
    if (server == SERVER_GH) { //GITHUB
        //email = `${username}@${EMAIL_GH}`;
        REPO_API = `${API_GH}/repos/${username}/${repo}`;
        //REPO_URL = `${SERVER}/${username}/${repo}`;
        REPO_URL = "https://"+token+"@github.com"+`/${username}/${repo}`;
    } else { //GITLAB
        //email = `${username}@${EMAIL_GL}`;
        caller = getUserInfo_GL;
        REPO_API = `${API_GL}/projects`;
        //TODO: Remove the need of groups in GitLab
        REPO_URL = `${SERVER}/${GROUP_GL}/${repo}`;
    }

    // TODO: Integrate AUTH and AUTHOR
    AUTH = {
        username,
        password,
        token
    };

    // form the AUTHOR
    getAuthorInfo(caller, username, ({
        name,
        email
    }) => {
        AUTHOR = {
            name,
            email
        }
        callback();
    });
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


// Retrieve email associated with GPG key
function getAuthorInfo(caller, username, callback) {

    //get username from the server
    caller(username, ({
        name
    }) => {
        //get email from the stored gpg key
        var keyInfo = [];
        retrieveKey(EXTENSION_ID, keyInfo).then(
            () => {
                callback({
                    name,
                    email: keyInfo[2]
                });
            });
    });
}
