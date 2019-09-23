// Costumize string sort by length then by dictionary order  
function sortByLength(arr) {
    return arr.sort(function(a, b) {
        return a.length - b.length || // sort by length, if equal then
            a.localeCompare(b); // sort by dictionary order
    });
}


// Compute the difference between two arrays
function arrayDifference(arr1, arr2) {
    return arr1.filter(x => !arr2.includes(x));
}


// Compute the intersect between two arrays
function arrayIntersect(a, b) {
    return a.filter(value => -1 !== b.indexOf(value));
}


// Remove duplicate elements from an array
function arrayUniq(array) {
    return array.filter(function(element, index, self) {
        return index == self.indexOf(element);
    });
}


// Check if an object is empty
function isEmpty(object) {
    for (let key in object) {
        if (key != undefined)
            return false;
    }
    return true;
}


// Get values from a dictionary
function getValues(dict) {
    return Object.keys(dict).map(function(key) {
        return dict[key];
    });
}


function swapKeyValue(obj) {
    var result = {};
    for (var key in obj) {
        result[obj[key]] = key;
    }
    return result;
}


// Remove the first and last slash
function trimSlash(str) {
    if (str == null) return;
    return str.replace(/^\/|\/$/g, '');
}


// Replace all "/" occurrences with "%2F"
function trimPath(fpath) {
    return fpath.replace(/\//g, '%2F');
}


// Replace all "%2F" occurrences with "/" 
function untrimPath(fpath) {
    return fpath.replace(/%2F/g, '\/');
}


// Compare two strings
function compareStrings(a, b) {
    // https://stackoverflow.com/a/40355107/2168416
    return -(a < b) || +(a > b)
}


// Find out directories' level
function getDirLevels(dirs) {
    /*
     * Assume dirs are sorted.
     * Assigning level 0 to the root directory, then:
     * Directories are seperated by "/", so
     * Excepting the root level, the number of "/" in level "l" is "l-1"
     * 0 : [""]
     * 1 : ["d1", "d2", ...]
     * 2 : ["d1/d2", "d3/d4", ...]
     */

    let levels = {};

    if (dirs.length < 1)
        return levels;

    if (dirs[0] == "") {
        levels[0] = [""];
	dirs.shift();
    }

    for (dir of dirs) {
        let l = dir.split("/").length;
        if (l in levels == false) {
            levels[l] = [];
        }
        levels[l].push(dir);
    }

    return levels;
}


// Find all subdirs in an array of file paths
function getCommonDirs(paths) {
    //FIXME: find a better solution
    /* How to get common dirs
     * - find subdirs
     * - remove duplicates
     */

    //get all subdirs
    var dirs = [];
    for (var i = 0; i < paths.length; i++) {
        //get intermediate paths
        var iPaths = getIntermediatePaths(paths[i])
        // concat paths to the main list
        dirs = dirs.concat(iPaths);
    }

    // Remove duplicates
    // Sort by length (useful for the later comparison)
    return arrayUniq(sortByLength(dirs));
}


// Find intermediate paths in a file path
function getIntermediatePaths(path) {
    var list = [];
    while (path != "") {
        path = getParentPath(path);
        list.push(path);
    }

    return list;
}


// Extract the parent path
function getParentPath(path) {
    // Remove everything after the last "/"
    return path.substr(0,
        path.lastIndexOf('/'));
}


// Remove the parent path
function removeParentPath(path) {
    // Split by "/" and take the last one
    path = path.split("/");
    return path.pop();
}


// Eextract everything after last dilemma
function extractAfter(str, dilemma) {
    return str.split(dilemma)[1];
}


// Extract everything between prefix and suffix
function extractBetween(str, prefix, suffix) {
    str = str.substring(str.indexOf(prefix) + prefix.length);
    return str.substring(0, str.indexOf(suffix));
}


// Detect position of first difference in 2 strings
function findFirstDiffPos(a, b) {
    // https://stackoverflow.com/a/32859917
    var i = 0;
    if (a === b) return -1;
    while (a[i] === b[i]) i++;
    return i;
}


// Sort an array using a key (path)
function sortArrayByKey(a, b) {
    return compareStrings(a.name, b.name)
}


// Convert a string to an array of buffer*/
var strToBufferArray = function(str) {
    return {
        ptr: Uint16Array.from(str, function(x, i) {
            return str.charCodeAt(i)
        }),

        size: Uint16Array.from(str, function(x, i) {
            return str.charCodeAt(i)
        }).length
    }
}


// Get difference between two dates
var getDiffDates = function(expDate) {
    var today = new Date();
    expDate = new Date(expDate);
    var diffDays = Math.abs(expDate.getTime() - today);
    return Math.ceil(diffDays / (1000 * 3600 * 24));
}


// Convert MM/DD/YYYY string to date
function toDate(date_str) {
    var parts = date_str.split("/");
    return new Date(parts[2], parts[1] - 1, parts[0]);
}


// Form the key expiration date
var getDiffSeconds = function(expDate) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    expDate = toDate(expDate);
    return (expDate - today) / 1000;
}

// validate regex pattern
var validatePattern = function(pattern, item) {
    return pattern.test(item);
}


// validate userId
var validateGPGuid = function(uid) {
    // TODO; Check all conditions required by gnupg
    // https://github.com/gpg/gnupg/blob/master/g10/keygen.c#L2936-#L2962

    let valid = false;
    let msg = "";
    if (uid.match(/^\d/)) {
        return {
            valid,
            msg: "Name may not start with a digit"
        }
    }

    if (uid.length < 5) {
        return {
            valid,
            msg: "Name must be at least 5 characters long"
        }
    }

    return {
        valid: true
    }
}


// Message Handler
function errorHandler({
    msg,
    err = false
}) {
    window.alert(msg);
    if (err) {
        //window.location.reload(true);
        return -1;
    }
    /*else{
    		window.close();
    	}*/
    //TODO: Add a better handler
}
