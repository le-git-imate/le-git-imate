const GITHUB = "github";
const GITLAB = "gitlab";
const SERVER_GH = `https://github.com`;
const SERVER_GL = `https://gitlab.com`; //TODO: make server configurable
const API_GH = `https://api.github.com`;
const API_GL = `https://gitlab.com/api/v4`;

const EXTENSION_ID = "le-git-imate";
const EMAIL_GH = `users.noreply.github.com`;
const EMAIL_GL = `users.noreply.gitlab.com`;
const PASS_GH = "github_pass";
const PASS_GL = "gitlab_pass";
const TOKEN_GH = "github_token";
const TOKEN_GL = "gitlab_token";
const USER_GH = "github_user";
const USER_GL = "gitlab_user";

const UNKNOWN_REQUEST = "unknown-request";
const UNKNOWN_SERVER = "unknown-server";

const REQ_DELETE = "delete";
const REQ_EDIT = "edit";
const REQ_NEW = "new";
const REQ_UPLOAD = "upload";
const REQ_REGULAR = "regular";
const REQ_MERGE = "merge";

const MERGE_CONFLICT = "merge-conflict";
const MERGE_CLOSED = "merge-closed";
const MERGE_GH = "pull";
const MERGE_GL = "merge_requests";

const MODE_BLOB = "100644";
const MODE_TREE = "40000";
const NULL_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

const TYPE_BLOB = "blob";
const TYPE_COMMIT = "commit";
const TYPE_TREE = "tree";

const PGP_SIG = "gpgsig";
const PGP_START = "-----BEGIN PGP SIGNATURE-----";
const PGP_END = "-----END PGP SIGNATURE-----";

const RPACK = "git-receive-pack";
const UPACK = "git-upload-pack";

// TODO: Put a comprehensive regex in place 
const REGEX_EMAIL =
    /^[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;
//github user regex: https://github.com/shinnn/github-username-regex#user-content-githubusernameregex
var REGEX_USER_GH = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/;
//gitlab user regex: https://github.com/gitlabhq/gitlabhq/blob/master/lib/gitlab/path_regex.rb#L130
var REGEX_USER_GL = /^[a-zA-Z0-9_\-]|[a-zA-Z0-9_]$/;
/* File Path
* https://stackoverflow.com/questions/16231210/file-path-validation-in-javascript
* https://digitalfortress.tech/tricks/top-15-commonly-used-regex/
* var REGEX_PATH = /^[a-z]:((\\|\/)[a-z0-9\s_@\-^!#$%&+={}\[\]]+)+\.xml$/;
* var REGEX_PATH = /^((\/|\\|\/\/|https?:\\\\|https?:\/\/)[a-z0-9 _@\-^!#$%&+={}.\/\\\[\]]+)+\.[a-z]+$/
**/
