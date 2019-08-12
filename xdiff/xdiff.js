"use strict";

var XDL_MERGE_ZEALOUS = 2;
var XDL_MERGE_ZEALOUS_ALNUM = 3;
//FIXME: Make sure this number works always
var XDL_LINE_MAX = 4294967295;

var Xmparam = function(xpp, markerSize, level, favor, style) {
    this.xpp = xpp;
    this.markerSize = markerSize;
    this.level = level;
    this.favor = favor;
    this.style = style;
}
