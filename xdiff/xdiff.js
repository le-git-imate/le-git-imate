"use strict";

var XDL_MERGE_ZEALOUS = 2;
var XDL_MERGE_ZEALOUS_ALNUM = 3;


var Xmparam = function(xpp, markerSize, level, favor, style,
    ancestor, file1, file2) {

    this.xpp = xpp;
    this.markerSize = markerSize;
    this.level = level;
    this.favor = favor;
    this.style = style;
    this.file1 = file1;
    this.file2 = file2;
}


var Mmfile = function(filename) {
    let fs = getFS();
    if (filename != undefined) {
        this.ptr = fs.readFileSync(filename);
        this.size = this.ptr.length;
    }
}
