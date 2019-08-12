const SERVER_GH = `https://github.com`;
const SERVER_GL = `https://gitlab.com`;

const GL_BASE_BRANCH = "js-target-branch";
const GL_COMMIT_MESSAGE = "form-control js-commit-message";
const GL_FILE_CONTENT = "ace_content";
const GL_FILE_NAME = "file_name";
const GL_FILE_PATH = "file_path";
const GL_MERGE_MESSAGE = "merge-message-edit";
const GL_PR_BRANCH = "js-source-branch";

const GH_BASE_BRANCH = "commit-ref css-truncate user-select-contain expandable base-ref";
const GH_COMMIT_MESSAGE = "commit-description-textarea";
const GH_COMMIT_SUMMARY = "commit-summary-input";
const GH_DPATH_LIST = "js-path-segment";
const GH_FILE_CONTENT = "form-control file-editor-textarea js-blob-contents js-code-textarea";
const GH_FILE_NAME = "form-control js-blob-filename js-breadcrumb-nav";
const GH_MERGE_MESSAGE = "merge_message_field";
const GH_MERGE_TITLE = "merge_title_field";
const GH_PR_BRANCH = "commit-ref css-truncate user-select-contain expandable head-ref";

var fileContents = {};


// Response to request from background script
chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {

        let {
            commitType,
            server
        } = message;
        if (server == SERVER_GH) {
            sendResponse(dataExtractor_GH(commitType));
        } else {
            sendResponse(dataExtractor_GL(commitType));
        }
});


// Extract the information from gitlab page
function dataExtractor_GL(commitType) {

    if (commitType == "merge") { //merge commit
        let baseBranch = document.getElementsByClassName(
            GL_BASE_BRANCH)[0].innerText;

        let prBranch = document.getElementsByClassName(
            GL_PR_BRANCH)[0].innerText;

        let commitMessage = document.getElementById(
            GL_MERGE_MESSAGE).value;

        return {
            baseBranch,
            prBranch,
            commitMessage
        };
    } else { //regular commit
        //TODO: Make sure if encode_utf8 is needed before passing content
        let commitMessage = document.getElementsByClassName(
            GL_COMMIT_MESSAGE)[0].value;

        // delete
        if (commitType == "delete") {
            return {
                commitMessage
            };
        }
        // edit/new
        else if ((commitType == "edit") || (commitType == "new")) {
            let newPath = getFilePath_GL(commitType);
            let fileContent = document.getElementsByClassName(
                GL_FILE_CONTENT)[0].innerText;
            return {
                newPath,
                fileContent,
                commitMessage
            };
        }
        // upload
        // TODO: Remove the need for pre-click
        // TODO: Support upload file through upload link
        else {
            var logFiles = function(files) {
                $(files).each(function() {
                    var fname = this.name;
                    var reader = new FileReader();
                    reader.readAsBinaryString(this);

                    reader.onloadend = function() {
                        fileContents[fname] = reader.result;
                    }
                });
            }

            /*$("a.markdown-selector").on("click", function(event) {
                logFiles(this.files)
            }).on("change", function(event) {
                logFiles(this.files)
            })*/

            $("div.dropzone-previews.blob-upload-dropzone-previews").on("drop", function(event) {
                logFiles(event.originalEvent.dataTransfer.files)
            });

            var fnames = Object.keys(fileContents);
            return {
                newPath: fnames[0],
                fileContent: fileContents[fnames[0]],
                commitMessage
            };

            return {
                commitMessage
            };
        }
    }
}


// Extract the information from github page
function dataExtractor_GH(commitType) {

    if (commitType == "merge") { //merge commit
        let baseBranch = document.getElementsByClassName(GH_BASE_BRANCH);
        baseBranch = baseBranch[0].innerText;

        let prBranch = document.getElementsByClassName(GH_PR_BRANCH);
        prBranch = prBranch[0].innerText;

        let commitDescription = document.getElementById(GH_MERGE_TITLE);
        commitDescription = commitDescription.value;

        let commitSummary = document.getElementById(GH_MERGE_MESSAGE);
        commitSummary = commitSummary.value;

        let commitMessage = commitSummary + "\n" + commitDescription;

        return {
            baseBranch,
            prBranch,
            commitMessage
        };

    } else { //regular commit
        let commitDescription = document.getElementById(GH_COMMIT_MESSAGE);
        commitDescription = commitDescription.value;

        let commitSummary = document.getElementById(GH_COMMIT_SUMMARY);
        let placeholder = commitSummary.placeholder;
        commitSummary = commitSummary.value;
        if (commitSummary.length < 1) commitSummary = placeholder;

        let commitMessage = commitSummary + "\n" + commitDescription;

        // delete
        if (commitType == "delete") {
            return {
                commitMessage
            };
        }
        // edit or new
        else if ((commitType == "edit") || (commitType == "new")) {
            let fileContent = document.getElementsByClassName(
                GH_FILE_CONTENT)[0].value;
            let fname = document.getElementsByClassName(
                GH_FILE_NAME)[0].value;
            let dirs = document.getElementsByClassName(GH_DPATH_LIST);
            let newPath = getFilePath_GH(dirs);
            newPath = `${newPath}/${fname}`;

            return {
                newPath,
                fileContent,
                commitMessage
            };
        }
        // upload
        // TODO:Remove the need for pre-click
        else {
		var logFiles = function(files) {
			$(files).each(function() {
			    var fname = this.name;
			    var reader = new FileReader();
			    reader.readAsBinaryString(this);

			    reader.onloadend = function() {
				fileContents[fname] = reader.result;
			    }
			});
		}

            $("input[type=file]").on("change", function(event) {
                logFiles(this.files)
            });

            $("file-attachment").on("drop", function(event) {
                logFiles(event.originalEvent.dataTransfer.files)
            });

            // TODO: Get all uploaded files for GitHub
            // NOTE: GitLab only allows to upload one file
            var fnames = Object.keys(fileContents);
            return {
                newPath: fnames[0],
                fileContent: fileContents[fnames[0]],
                commitMessage
            };
        }
    }
}


// Get file path in gitlab UI
function getFilePath_GL(commitType) {
    let tag = commitType == "new" ? GL_FILE_NAME : GL_FILE_PATH;
    return document.getElementById(tag).value;
}


// Get file path in github UI
function getFilePath_GH(dirs) {

    // Capture changes in path by taking the upated path
    let filePath = [];
    for (let dir of dirs) {
        filePath.push(dir.innerText)
    }
    // Remove anything before and after the path : REPO<path>REPLACEME 	
    filePath.shift();
    filePath.pop();

    return filePath.join('/');
}


function encode_utf8(s) {
	return unescape(encodeURIComponent(s));
}
