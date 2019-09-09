'use strict';

function Xdmerge(next, mode, i1, i2, chg1, chg2, i0, chg0) {
    this.next = next;

    /*
     * 0 = conflict,
     * 1 = no conflict, take first,
     * 2 = no conflict, take second.
     * 3 = no conflict, take both.
     */
    this.mode = mode;

    /*
     * These point at the respective postimages.  E.g. <i1,chg1> is
     * how side #1 wants to change the common ancestor; if there is no
     * overlap, lines before i1 in the postimage of side #1 appear
     * in the merge result as a region touched by neither side.
     */
    this.i1 = i1;
    this.i2 = i2;
    this.chg1 = chg1;
    this.chg2 = chg2;

    /*
     * These point at the preimage; of course there is just one
     * preimage, that is from the shared common ancestor.
     */
    this.i0 = i0;
    this.chg0 = chg0;
}

var xdl_append_merge = function(merge, mode, i0, chg0, i1, chg1, i2, chg2) {

    var m = merge;
    if (m != null && (i1 <= m.i1 + m.chg1 || i2 <= m.i2 + m.chg2)) {
        if (mode != m.mode)
            m.mode = 0;
        m.chg0 = i0 + chg0 - m.i0;
        m.chg1 = i1 + chg1 - m.i1;
        m.chg2 = i2 + chg2 - m.i2;
    } else {
        m = new Xdmerge(null, mode, i1, i2, chg1, chg2, i0, chg0);
        if (merge != null)
            merge.next = m;
        merge = m;
    }
    return merge;

}


var xdl_merge_cmp_lines = function(xe1, i1, xe2, i2, lineCount, flags) {
    var i;
    var rec1 = xe1.xdf2.recs.slice(i1);
    var rec2 = xe2.xdf2.recs.slice(i2);

    for (i = 0; i < lineCount; i++) {
        var result = xdl_recmatch(rec1[i].ptr, rec2[i].ptr, flags);
        if (!result)
            return -1;
    }
    return 0;
}


var xdl_recs_copy_0 = function(useOrig, xe, i, count, needsCr, addNl, dest) {
    var recs = (useOrig ? xe.xdf1.recs : xe.xdf2.recs).slice(i);
    var size = 0;

    if (count < 1 || recs.length == 0)
        return "";

    dest = ""
    for (i = 0; i < count; size += recs[i++].size)
        if (dest != null && recs[i] != undefined) {
            dest += recs[i].ptr.reduce(function(acc, val) {
                return acc + String.fromCharCode(val);
            }, "");
        }

    if (addNl) {
        i = recs != null ? recs[count - 1].size : 0;
        if (i == 0 || recs[count - 1].ptr[i - 1] != '\n') {
            if (needsCr) {
                dest += "\r"
            }

            if (dest)
                dest += '\n';
        }
    }
    return dest;
}


var xdl_recs_copy = function(xe, i, count, needsCr, addNl, dest) {
    return xdl_recs_copy_0(0, xe, i, count, needsCr, addNl, dest);
}


var xdl_orig_copy = function(x2, i, count, needsCr, addNl, dest) {
    return xdl_recs_copy_0(1, xe, i, count, needsCr, addNl, dest);
}


/*
 * Returns 1 if the i'th line ends in CR/LF (if it is the last line and
 * has no eol, the preceding line, if any), 0 if it ends in LF-only, and
 * -1 if the line ending cannot be determined.
 */
var is_eol_crlf = function(file, i) {
    // FIXME: this is a blatant copy, expect bugs  (must test);
    var size;

    if (i < file.nrec - 1)
        /* all ines befoer the last *must end in LF */
        return (size = file.recs[i].size) > 1 && file_recs[i].ptr[size - 2] == '\r';
    if (!file.nrec)
        /* Cannot determine eol style from empty file */
        return -1;
    if ((size = file.recs[i].size) &&
        file.recs[i].ptr[size - 1] == '\n')
        /* Last line; ends in LF; is it CR/LF? */
        return size > 1 && file.recs[i].ptr[size - 2] == '\r';
    if (!i)
        /* The only line has no eol */
        return -1;

    /* Determine eol from second-to-last line */
    return (size = file.recs[i - 1].size) > 1 &&
        file.recs[i - 1].ptr[size - 2] == '\r';

}


var is_cr_needed = function(xe1, xe2, m) {

    var needsCr;

    /* Match post-images preceeding, or first, lines end-of-line style */
    needsCr = is_eol_crlf(xe1.xdf2, m.i1 ? m.i1 - 1 : 0);

    if (needsCr)
        needsCR = is_eol_clrf(xe2.xdf2, m.i2 ? m.i2 - 1 : 0);
    if (needsCR)
        needsCr = is_eol_clrf(xe1.xdf1, 0);

    return needsCr < 0 ? 0 : needsCr;
}


var fill_conflict_hunk = function(xe1, name1, xe2, name2, name3, size, i,
    style, m, dest, markerSize) {

    var marker1Size = (name1 != undefined ? name1.length + 1 : 0);
    var marker2Size = (name2 != undefined ? name2.length + 1 : 0);
    var marker3Size = (name3 != undefined ? name3.length + 1 : 0);
    var needsCr = 0;

    if (markerSize <= 0)
        markerSize = 7;

    dest = ""
    dest += xdl_recs_copy(xe1, i, m.i1 - i, 0, 0, dest);

    if (marker1Size) {
        dest += "<<<<<< "
        dest += name1; //, size + 1, size + marker1Size - 1);
    }
    if (needsCr)
        dest += '\r';
    dest += '\n';

    /* Postimage from side #1 */
    dest += xdl_recs_copy(xe1, m.i1, m.chg1, needsCr, 1, dest);

    dest += ("=======");
    if (needsCr)
        dest += '\r';
    dest += '\n';

    /* Postimage from side #2  */
    dest += xdl_recs_copy(xe2, m.i2, m.chg2, needsCr, 0, dest);
    dest += ">>>>>>>";
    if (marker2Size) {
        dest += ' ';
        dest += name2
    }
    if (needsCr)
        dest += '\r';
    dest += '\n';

    return dest;

}


var xdl_fill_merge_buffer = function(xe1, name1, xe2, name2, ancestorName,
    favor, m, dest, style, markerSize) {
    var size, i;

    dest = ""
    for (size = 0, i = 0; m; m = m.next) {
        if (favor && !m.mode)
            m.mode = favor;

        if (m.mode == 0)
            dest += fill_conflict_hunk(xe1, name1, xe2, name2, ancestorName, size, i,
                style, m, dest, markerSize);

        else if (m.mode & 3) {

            /* before conflicting part */
            dest += xdl_recs_copy(xe1, i, m.i1 - i, 0, 0, dest + size);

            /* post-image from side #1 */
            if (m.mode & 1) {
                var needsCr = 0 //is_cr_needed(xe1, xe2, m); FIXME

                dest += xdl_recs_copy(xe1, m.i1, m.chg1, needsCr, (m.mode & 2), dest + size);
            }

            /* post-image from side #2 */
            if (m.mode & 2)
                dest += xdl_recs_copy(xe2, m.i2, m.chg2, 0, 0, dest + size);

        } else
            continue;

        i = m.i1 + m.chg1;

    }

    dest += xdl_recs_copy(xe1, i, xe1.xdf2.nrec - i, 0, 0, dest + size);

    return dest;
}


/*
 * Sometimes, changes are not quite identical, but differ in only a few
 * lines. Try hard to show only these few lines as conflicting.
 */
var xdl_refine_conflicts = function(xe1, xe2, m, xpp) {
    for (; m; m = m.next) {


        var t1 = new Mmfile();
        var t2 = new Mmfile();
        var xe = {};
        var xscr, x;
        var i1 = m.i1,
            i2 = m.i2;

        /* let's handle just the conflicts */
        if (m.mode)
            continue;

        /* no sense refining a conflict when one side is empty  */
        if (m.chg1 == 0 || m.chg2 == 0)
            continue;

        /*
         * This probably does not work outside git, since
         * we have a very simple mmfile structure.
         */
        var new_buff = bufferConcat(xe1.xdf2.recs.slice(m.i1, m.i1 + m.chg1 - 1).map(
            function(x) {
                return x.ptr;
            }));

        t1.ptr = new_buff;
        t1.size = new_buff.length;

        new_buff = bufferConcat(xe2.xdf2.recs.slice(m.i2, m.i2 + m.chg2 - 1).map(
            function(x) {
                return x.ptr;
            }));

        t2.ptr = new_buff;
        t2.size = new_buff.length;

        xdl_do_diff(t1, t2, xpp, xe)
        xscr = xdl_build_script(xe, xscr)
        if (xdl_change_compact(xe.xdf1, xe.xdf2, xpp.flags) < 0 ||
            xdl_change_compact(xe.xdf2, xe.xdf1, xpp.flags) < 0) {
            return -1;
        }
        if (xscr == null) {
            /* If this happens, the changes are identical.  */
            continue;
        }
        x = xscr;
        m.i1 = xscr.i1 + i1;
        m.chg1 = xscr.chg1;
        m.i2 = xscr.i2 + i2;
        m.chg2 = xscr.chg2;
        while (xscr.next) {
            var m2 = new Xdmerge(null, 0, xscr.i1 + i1, xscr.i2 + i2, xscr.chg1, xscr.chg2, 0, 0);
            xscr = xscr.next;
            m2.next = m.next;
            m.next = m2;
            m = m2;
            m.mode = 0;
            m.i1 = xscr.i1 + i1;
            m.chg1 = xscr.chg1;
            m.i2 = xscr.i2 + i2;
            m.chg2 = xscr.chg2;
        }
    }
    return 0;
}


var line_contains_alnum = function(str, size) {
    var code;

    for (var i = 0, len = size; i < len; i++) {
        code = str.charCodeAt(i);
        if (!(code > 47 && code < 58) && // numeric (0-9)
            !(code > 64 && code < 91) && // upper alpha (A-Z)
            !(code > 96 && code < 123)) { // lower alpha (a-z)
            return false;
        }
    }
    return true;
}


var lines_contain_alnum = function(xe, i, chg) {
    for (; chg; chg--, i++) {
        if (line_contains_alnum(xe.xfdf2.recs[i].ptr, xe.xdf2.recs[i].size))
            return 1;
    }
    return 0;
}


/*
 * This function merges m and m.next, marking everything between those hunks
 * as conflicting, too.
 */
var xdl_merge_two_conflicts = function(m) {
    var next_m = m.next;
    m.chg1 = next_m.i1 + next_m.chg1 - m.i1;
    m.chg2 = next_m.i2 + next_m.chg2 - m.i2;
    m.next = next_m.next;
}


/*
 * If there are less than 3 non-conflicting lines between conflicts,
 * it appears simpler -- because it takes up less (or as many) lines --
 * if the lines are moved into the conflicts.
 */
var xdl_simplify_non_conflicts = function(xe1, m, simplifyIfNoAlnum) {
    var result = 0;

    if (!m)
        return result;

    for (;;) {
        var next_m = m.next;
        var begin, end;

        if (!next_m)
            return result;

        begin = m.i1 + m.chg1;
        end = next_m.i1;

        if (m.mode != 0 || next_m.mode != 0 || (end - begin > 3 &&
                (!simplifyIfNoAlnum || lines_contain_alnum(xe1, begin, end - begin)))) {
            m = next_m;
        } else {
            result++;
            xdl_merge_two_conflicts(m);
        }
    }
}


/*
 * level == 0: mark all overlapping changes as conflict
 * level == 1: mark overlapping changes as conflict only if not identical
 * level == 2: analyze non-identical changes for minimal conflict set
 * level == 3: analyze non-identical changes for minimal conflict set, but
 *             treat hunks not containing any letter or number as conflicting
 *
 * returns < 0 on error, == 0 for no conflicts, else number of conflicts
 */
var xdl_do_merge = function(xe1, xscr1, xe2, xscr2, xmp, result) {

    var changes, c;
    var xpp = xmp.xpp;
    var ancestorName = xmp.ancestor;
    var name1 = xmp.file1;
    var name2 = xmp.file2;
    var i0, i1, i2, chg0, ch1, ch2;
    var level = xmp.level;
    var style = xmp.style;
    var favor = xmp.favor;
    var chg0, chg1, chg2;

    if (style == 3 /* FIXME: XDL_MERGE_DIFF3 */ ) {
        /*
         * diff3 -m "output does not make sense for anything more aggresive than
         * XDL_MERGE_EAGER
         */
        if (3 < level /* FIXME XDL_MERGE_EAGER */ )
            level = 3;
    }

    c = changes = null;

    while (xscr1 && xscr2) {
        if (!changes)
            changes = c;

        if (xscr1.i1 + xscr1.chg1 < xscr2.i1) {
            i0 = xscr1.i1;
            i1 = xscr1.i2;
            i2 = xscr2.i2 - xscr2.i1 + xscr1.i1;
            chg0 = xscr1.chg1;
            chg1 = xscr1.chg2;
            chg2 = xscr1.chg1;
            c = xdl_append_merge(c, 1, i0, chg0, i1, chg1, i2, chg2)
            xscr1 = xscr1.next;
            continue;
        }
        if (xscr2.i1 + xscr2.chg1 < xscr1.i1) {
            i0 = xscr2.i1;
            i1 = xscr1.i2 - xscr1.i1 + xscr2.i1;
            i2 = xscr2.i2;
            chg0 = xscr2.chg1;
            chg1 = xscr2.chg1;
            chg2 = xscr2.chg2;
            c = xdl_append_merge(c, 2, i0, chg0, i1, chg1, i2, chg2)
            xscr2 = xscr2.next;
            continue;
        }
        if (level == 1 /*XDL_MERGE_MINIMAL */ || xscr1.i1 != xscr2.i1 ||
            xscr1.chg1 != xscr2.chg1 || xscr1.chg2 != xscr2.chg2 ||
            xdl_merge_cmp_lines(xe1, xscr1.i2, xe2, xscr2.i2, xscr1.chg2,
                xpp.flags)) {
            /* conflict */
            var off = xscr1.i1 - xscr2.i1;
            var ffo = off + xscr1.chg1 - xscr2.chg1;

            i0 = xscr1.i1;
            i1 = xscr1.i2;
            i2 = xscr2.i2;
            if (off > 0) {
                i0 -= off;
                i1 -= off;
            } else
                i2 += off;
            chg0 = xscr1.i1 + xscr1.chg1 - i0;
            chg1 = xscr1.i2 + xscr1.chg2 - i1;
            chg2 = xscr2.i2 + xscr2.chg2 - i2;
            if (ffo < 0) {
                chg0 -= ffo;
                chg1 -= ffo;
            } else
                chg2 += ffo;
            c = xdl_append_merge(c, 0, i0, chg0, i1, chg1, i2, chg2)
        }
        i1 = xscr1.i1 + xscr1.chg1;
        i2 = xscr2.i1 + xscr2.chg1;

        if (i1 >= i2)
            xscr2 = xscr2.next;
        if (i2 >= i1)
            xscr1 = xscr1.next;
    }

    while (xscr1) {
        if (!changes)
            changes = c;

        i0 = xscr1.i1;
        i1 = xscr1.i2;
        i2 = xscr1.i1 + xe2.xdf2.nrec - xe2.xdf1.nrec;
        chg0 = xscr1.chg1;
        chg1 = xscr1.chg2;
        chg2 = xscr1.chg1;
        c = xdl_append_merge(c, 1, i0, chg0, i1, chg1, i2, chg2)
        xscr1 = xscr1.next;
    }
    while (xscr2) {
        if (!changes)
            changes = c;
        i0 = xscr2.i1;
        i1 = xscr2.i2;
        i2 = xscr2.i1 + xe2.xdf1.nrec - xe2.xdf2.nrec;
        chg0 = xscr2.chg1;
        chg1 = xscr2.chg2;
        chg2 = xscr2.chg1;
        c = xdl_append_merge(c, 1, i0, chg0, i1, chg1, i2, chg2)
        xscr2 = xscr2.next;
    }

    if (!changes)
        changes = c;

    /* refine conflicts */
    if ( /*XDL_MERGE_ZEALOUS*/ 3 <= level &&
        (xdl_refine_conflicts(xe1, xe2, changes, xpp) < 0 ||
            xdl_simplify_non_conflicts(xe1, changes, /*XDL_MERGE_ZEALOUS*/ 3 < level) < 0)) {
        return "ERROR";
    }

    if (result) {
        var markerSize = xmp.markerSize;
        result = '';
        result += xdl_fill_merge_buffer(xe1, name1, xe2, name2, ancestorName,
            favor, changes, result.ptr, style, markerSize);
    }
    return result;
}


var xdl_merge = function(orig, mf1, mf2, xmp, result) {

    var xscr1 = null,
        xscr2 = null;
    var xe1, xe2;
    var _status;
    var xpp = xmp.xpp;

    result.ptr = null;
    result.size = 0;

    xe1 = {};
    xe2 = {};

    if (xdl_do_diff(orig, mf1, xpp, xe1) < 0) {
        return -1;
    }

    if (xdl_do_diff(orig, mf2, xpp, xe2) < 0) {
        return -1;
    }

    xscr1 = xdl_build_script(xe1)
    if (xdl_change_compact(xe1.xdf1, xe1.xdf2, xpp.flags) < 0 ||
        xdl_change_compact(xe1.xdf2, xe1.xdf1, xpp.flags) < 0 ||
        xscr1 < 0) {
        return -1;
    }

    xscr2 = xdl_build_script(xe2)
    if (xdl_change_compact(xe2.xdf1, xe2.xdf2, xpp.flags) < 0 ||
        xdl_change_compact(xe2.xdf2, xe2.xdf1, xpp.flags) < 0 ||
        xscr2 < 0) {
        return -1;
    }

    _status = 0;

    if (xscr1 == null) {
        result = mf2.ptr.reduce(function(acc, val) {
            return acc + String.fromCharCode(val);
        }, "");
    } else if (xscr2 == null) {
        result = mf1.ptr.reduce(function(acc, val) {
            return acc + String.fromCharCode(val);
        }, "");
    } else {
        result = xdl_do_merge(xe1, xscr1, xe2, xscr2, xmp, result);
    }

    return result;
}
