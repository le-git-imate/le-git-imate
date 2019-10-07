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


// Check if the account info is available
function checkAccountInfo({
    username
}, callback) {
    let id = SERVER == SERVER_GH ? USER_GH : USER_GL;
    retrieveObject(id).then(
        (users) => {
            let credentials = users[username];
            if (!credentials) {
                return errorHandler({
                    msg: `The extension does not have access to \"${
			username}\" account's credentials on the \"${SERVER}\" server`,
                    err: true
                });
            } else {
                callback(credentials);
            }
        });
}


// Get basic info about the request
function setConfig({
    username,
    credentials,
    repo,
    server
}, callback) {

    let {
        password,
        token
    } = credentials;

    let caller = getUserInfo;
    if (server == SERVER_GH) { //GITHUB
        //email = `${username}@${EMAIL_GH}`;
        REPO_API = `${API_GH}/repos/${username}/${repo}`;
        REPO_URL = `${SERVER}/${username}/${repo}`;
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
