/**
 * Sing commit using pgp key
 * @param  {message} plain_text
 * @param  {userId} take it to retrieve priv key
 * @return {String} singed message pgp_message
 */
function signContent(data, callback) {
    var keyInfo = [];
    retrieveKey(EXTENSION_ID, keyInfo).then(
        () => {
            var privKeyObj = keyInfo[0];
            if (privKeyObj.err) {
                return errorHandler({
                    msg: "Private key is not found!",
                    err: true
                });
            } else {
                // TODO: take passphrase
                // TODO: let user pick the key

                // Get the first key retrieved from local storage
                privKeyObj = privKeyObj.keys[0];

                var options = {
                    data: data.toString(),
                    privateKeys: privKeyObj,
                    detached: false,
                    armor: true
                };

                // sign the message
                openpgp.sign(options).then(
                    (result) => {
                        callback(result.data);
                    });
            }
        });
}


// Store account info
function storeAccounts({
    server,
    password,
    token,
    username,
    userTag
}) {

    chrome.storage.local.get((data) => {
        // Add the new user, if already exists, it will be updated
        let users = data[userTag];
        users[username] = {
            password,
            token
        }

        // Store updated users' list
        storeObject(userTag, users).then(
            (result) => { //TODO: Display stored keys in a new page
                if (result == 0) {
                    var msg = `Account information for the ${server} user \"${
			username}\" is successfully imported.`
                    return errorHandler({
                        msg
                    });
                } else {
                    return errorHandler({
                        msg: "Failed! Please try again.",
                        err: true
                    });
                }
            });
    });
}


// Store user info for github
function setGHAccount() {
    let username = document.getElementById(USER_GH).value;
    let token = document.getElementById(TOKEN_GH).value;
    let password = document.getElementById(PASS_GH).value;

    /*//TODO: validate user, pass, and token
    if (!validatePattern(REGEX_USER_GH, username)) {
    	return errorHandler({msg: "username is not valid!", err:true});
    }
    //Check if credentials are valid*/

    storeAccounts({
        server: GITHUB,
        password,
        token,
        username,
        userTag: USER_GH,
    });
}


// Store user info for gitlab
function setGLAccount() {

    let username = document.getElementById(USER_GL).value;
    let token = document.getElementById(TOKEN_GL).value;
    let password = document.getElementById(PASS_GL).value;

    /*//TODO: validate user, pass, and token
    if (!validatePattern(REGEX_USER_GL, username)) {
    	return errorHandler({msg: "username is not valid!", err:true});
    }
    //Check if credentials are valid*/

    storeAccounts({
        server: GITLAB,
        password,
        token,
        username,
        userTag: USER_GL,
    });
}


/******************************************************
 * Some keyring manager functions are taken from
 * Mailvelope: https://github.com/mailvelope/mailvelope
 *******************************************************/
// Read the key info
function readKeys(armored) {
    let parsedKey = openpgp.key.readArmored(armored);
    if (parsedKey.err) {
        return errorHandler({
            msg: "Imported key is not valid!",
            err: true
        });
    } else {
        return parsedKey;
    }
}


// Import the key as text
function importKey() {
    let prvkey = document.getElementById("newKey").value;
    storeKey(prvkey);
}


// Import the key as file
function uploadKey() {
    var inputfile = document.getElementById("input-file");
    inputfile.addEventListener("change", handleFiles, false);

    function handleFiles() {
        var fileList = this.files;
        var numFiles = fileList.length;

        var reader = new FileReader();
        //TODO: read multiple key files
        reader.readAsText(fileList[0]);
        reader.onloadend = function() {
            storeKey(reader.result);
        }
    }
}


// Generate the key
function generateKey() {
    // TODO: Make all parameters optional
    let keyExpiration = 0
    let keySize = 2048
    let passphrase = "";

    //validate userId
    let userId = document.getElementById("name").value;
    let {
        valid,
        msg
    } = validateGPGuid(userId);
    if (!valid) {
        return errorHandler({
            msg,
            err: true
        });
    }

    // validate email
    let email = document.getElementById("email").value;
    if (!validatePattern(REGEX_EMAIL, email)) {
        return errorHandler({
            msg: "Email is not valid!",
            err: true
        });
    }

    let options = {
        userIds: [{
            name: userId,
            email: email
        }],
        numBits: keySize,
        passphrase: passphrase,
        keyExpirationTime: keyExpiration
    };

    openpgp.generateKey(options).then(
        (key) => {
            storeKey(key.privateKeyArmored);
        });
}


// Get primary or first available user id of key
function getUserId({
    key,
    validityCheck = false
}) {
    var primaryUser = key.getPrimaryUser();
    if (primaryUser) {
        return primaryUser.user.userId.userid;
    } else {
        if (!validityCheck) {
            // take first available user ID
            for (var i = 0; i < key.users.length; i++) {
                if (key.users[i].userId) {
                    return key.users[i].userId.userid;
                }
            }
        }
        return errorHandler({
            msg: "invalid userid!",
            err: true
        })
    }
}


// Extract the email from key userId
var extractEmail = function(userId) {
    var username = userId.substr(0, userId.lastIndexOf("<") - 1);
    var email = userId.substr(userId.indexOf("<") + 1).slice(0, -1);;

    return {
        username,
        email
    };
}


// Get basic info about the pgp key
function extractKeyInfo(keys) {

    var result = [];
    keys.forEach(
        (key) => {
            var keysInfo = {};

            if (key.isPublic()) {
                keysInfo.type = 'public';
            } else {
                keysInfo.type = 'private';
            }

            keysInfo.keyId = key.primaryKey.getKeyId().toHex().toUpperCase();
            keysInfo.fingerprint = key.primaryKey.getFingerprint().toUpperCase();

            try {
                keysInfo.userId = getUserId({
                    key
                });
                let {
                    username,
                    email
                } = extractEmail(keysInfo.userId);
                keysInfo.username = username;
                keysInfo.email = email;

                keysInfo.exDate = key.getExpirationTime();
                if (keysInfo.exDate) {
                    keysInfo.exDate = keysInfo.exDate.toISOString();
                } else {
                    keysInfo.exDate = false;
                }

            } catch (e) { //TODO: Display a message
                keysInfo.username = keysInfo.username || 'NO USERID FOUND';
                keysInfo.email = keysInfo.email || 'UNKNOWN';
                keysInfo.exDate = keysInfo.exDate || 'UNKNOWN';
            }

            keysInfo.crDate = key.primaryKey.created.toISOString();

            result.push(keysInfo);
        });

    return result;

}


// Add a key into the local keyring
var storeKey = function(privkey) {
    var parsedKey = readKeys(privkey);
    parsedKey = extractKeyInfo(parsedKey.keys);

    var crDate = parsedKey[0].crDate;
    var keyId = parsedKey[0].keyId;
    var userId = parsedKey[0].userId;
    var email = parsedKey[0].email;

    // convert iso time to unix time
    crDate = new Date(crDate);
    crDate = crDate.getTime() / 1000;

    storeObject(EXTENSION_ID, [privkey, keyId, email, crDate]).then(
        (result) => {
            if (result == 0) {
                //TODO:  display stored keys in a new page
                var msg = `Private key ${keyId} for user \"${userId}\" is successfully imported into the key ring.`
                return errorHandler({
                    msg
                });
            } else {
                return errorHandler({
                    msg: "Failed! Please try again."
                });
            }
        });
}


// Add an object into the local storage
var storeObject = function(id, obj) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({
            [id]: obj
        }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(0);
            }
        });
    });
}


// Extract the info of stored key
var getKeyInfo = function(privkeyInfo, keyInfo) {
    var parsedKey = openpgp.key.readArmored(privkeyInfo[0]);
    keyInfo.push(parsedKey);
    keyInfo.push(privkeyInfo[1]);
    keyInfo.push(privkeyInfo[2]);
}


// Retrieve the key form the local keyring
var retrieveKey = function(id, keyInfo) {
    return retrieveObject(id).then(
        (privkeyInfo) => getKeyInfo(privkeyInfo, keyInfo)
    );
}


// Retrieve an object from the local storage
var retrieveObject = function(id) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(id, items => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(items[id]);
            }
        });
    });
}


// Event Listeners
document.addEventListener('DOMContentLoaded', function() {

    var add_github = document.getElementById('add-github');
    var add_gitlab = document.getElementById('add-gitlab');
    var key_generate = document.getElementById('key-generate');
    var key_import = document.getElementById('key-import');
    var key_upload = document.getElementById('input-file');

    if (add_github)
        add_github.addEventListener(
            'click', setGHAccount);

    if (add_gitlab)
        add_gitlab.addEventListener(
            'click', setGLAccount);

    if (key_generate)
        key_generate.addEventListener(
            'click', generateKey);

    if (key_import)
        key_import.addEventListener(
            'click', importKey);

    //TODO: Allow to upload key file
    /*if (key_upload)
    	key_upload.addEventListener(
    	'click', uploadKey);*/
});
