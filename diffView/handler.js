const DIFF_WINDOW = "diffoutput";

// Display diff
function displayDiff(requestInfo, fileInfo) {
    let {
        baseBranch,
        commitType,
        fileContent
    } = requestInfo;
    let {
        rename,
        oldPath,
        newPath
    } = fileInfo;

    // TODO: display content of new/uploaded files
    if (commitType == REQ_EDIT) {
        //changes for edit requests
        displayChanges({
            branch: baseBranch,
            oldPath,
            newPath,
            rename,
            newContent: fileContent
        });
    } else {
        //changes for other requests
        listFiles(newPath, commitType);
    }
}


// Make a table of added/deleted file
function listFiles(fpath, commitType) {
    // find out if file is added or deteled
    // TODO: Use "uploaded" title for uploaded files
    // TODO: Improve the UI
    let thead;
    if ((commitType == REQ_NEW) || (commitType == REQ_UPLOAD))
        thead = "Added";
    else
        thead = "Deleted";

    let files = [];
    files.push(`./${fpath}`);
    let diffoutputdiv = document.getElementById(DIFF_WINDOW);
    addLabelTag(DIFF_WINDOW, diffoutputdiv);
    diffoutputdiv.appendChild(createTable(files, thead));
}


// Show the diff for edited file 
function displayChanges({
    branch,
    oldPath,
    newPath,
    rename,
    newContent
}) {
    // Form url to fetch the old content
    let fpath = rename ? oldPath: newPath;
    let endpoint = fileUrls(branch, [fpath]);

    // Set json format
    let json = SERVER == SERVER_GH ? true : false;

    // Get the old content and compute the diff
    var data = {};
    var callback = ({
        endpoint,
        response
    }) => {
        if (SERVER == SERVER_GH) {
            response = atob(response.content);
        }
        computeDiff({
            // TODO: Show remaned files
            fpath: `./${fpath}`,
            oldContent: response,
            newContent
        });
    };

    singleAPICall({
        endpoint,
        json
    }, callback);
}


/**
 * Create a visualized diff view between two files
 * @params {fpath, oldContent, newContent}
 * @return {append diff_view}
 */
function computeDiff({
    fpath,
    oldContent,
    newContent
}) {
    var basetxt = difflib.stringAsLines(oldContent);
    var newtxt = difflib.stringAsLines(newContent);
    var cmdiff = new difflib.SequenceMatcher(basetxt, newtxt);
    var opcodes = cmdiff.get_opcodes();
    var diffoutputdiv = document.getElementById(DIFF_WINDOW);
    // display only one line before and after the change
    var contextSize = '1';

    // add diff view to the body
    diffoutputdiv.innerHTML = "";
    addLabelTag(DIFF_WINDOW, diffoutputdiv);

    diffoutputdiv.appendChild(diffview.buildView({
        baseTextLines: basetxt,
        newTextLines: newtxt,
        opcodes: opcodes,
        baseTextName: "Base Version",
        newTextName: "Updated Version",
        contextSize: contextSize,
        //viewType: an inline diff view is
        viewType: 1,
        fileName: fpath
    }));

    // set scroll for the table
    setScrollable(
        document.getElementsByClassName("diff inlinediff")[0], 8);
}


// Make diff section scrollable
function setScrollable(table, maxRows) {
    var wrapper = table.parentNode;
    var rowsInTable = table.rows.length;
    var height = 0;
    if (rowsInTable > maxRows) {
        for (var i = 0; i < maxRows; i++) {
            height += table.rows[i].clientHeight;
        }
        wrapper.style.height = height + "px";
    }
}


// Create a simple table
function createTable(files, thead) {
    var table = document.createElement('table');
    var tbody = document.createElement('tbody');
    var tr = document.createElement('tr');

    tbody.appendChild(tr);
    table.appendChild(tbody);
    table.setAttribute('class', 'changed_files');

    var row, cell;
    for (var i = 0; i < files.length; i++) {
        row = table.insertRow(0);
        row.className = thead;
        cell = row.insertCell(0);
        cell.innerHTML = files[i];
    }

    var header = table.createTHead();
    row = header.insertRow(0);
    cell = row.insertCell(0);
    cell.innerHTML = thead + " files";

    return table;
}


// Add label to html elements dynamically
function addLabelTag(el_id, parent_el) {
    var newlabel = document.createElement("Label");
    newlabel.setAttribute("for", el_id);
    newlabel.innerHTML = "Changes";
    parent_el.appendChild(newlabel);
}
