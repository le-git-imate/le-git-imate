"use strict";

/* this value used to be 4294967295. Interestingly this doesn't work on
 * javascript. the reason as to why this happens is that the unsigned longs get
 * "promoted" to bigger variables on if checks. I'd call this a bug in the
 * original implementation
 */
const XDL_LINE_MAX = 2147483647;
const XDL_SNAKE_CNT = 20;
const XDL_HEUR_MIN = 256;
const XDF_INDENT_HEURISTIC = (1 << 8);


function DD(xdf) {
    this.nrec = xdf.nreff;
    this.ha = xdf.ha;
    this.rchg = xdf.rchg;
    this.rindex = xdf.rindex;
}


function SplitMeasurement() {
    this.end_of_file = 0;
    this.indend = 0;
    this.pre_blank = 0;
    this.pre_indent = 0;
    this.post_blank = 0;
    this.post_indent = 0;
}


function SplitScore() {
    this.effective_indent = 0;
    this.penalty = 0;
}


function XdlGroup(xdf) {
    this.start = 0;
    this.end = 0;
    while (xdf.rchg[this.end] != 0)
        this.end += 1;
}


/*
 * Fill m with information about a 
 * hypothetical split of xdf above line split.
 */
var measure_split = function(xdf, split, m) {
    var i;

    if (split >= xdf.nrec) {
        m.end_of_file = 1;
        m.indent = -1;
    } else {
        m.end_of_file = 0;
        m.indent = get_indent(xdf.recs[split]);
    }

    m.pre_blank = 0;
    m.pre_indent = -1;
    for (i = split - 1; i >= 0; i--) {
        m.pre_indent = get_indent(xdf.recs[i]);
        if (m.pre_indent != -1)
            break;
        m.pre_blank += 1;
        if (m.pre_blank == MAX_BLANKS) {
            m.pre_indent = 0;
            break;
        }
    }

    m.post_blank = 0;
    m.post_indent = -1;
    for (i = split + 1; i < xdf.nrec; i++) {
        m.post_indent = get_indent(xdf.recs[i]);
        if (m.post_indent != -1)
            break;
        m.post_blank += 1;
        if (m.post_blank == MAX_BLANKS) {
            m.post_indent = 0;
            break;
        }
    }
}



/*
 * See "An O(ND) Difference Algorithm and its Variations", by Eugene Myers.
 * Basically considers a "box" (off1, off2, lim1, lim2) and scan from both
 * the forward diagonal starting from (off1, off2) and the backward diagonal
 * starting from (lim1, lim2). If the K values on the same diagonal crosses
 * returns the furthest point of reach. We might end up having to expensive
 * cases using this algorithm is full, so a little bit of heuristic is needed
 * to cut the search and to return a suboptimal point.
 */
var xdl_split = function(ha1, off1, lim1, ha2, off2, lim2, kvdf, kvdb,
    need_min, spl, xenv, kvd) {
    var dmin = off1 - lim2;
    var dmax = lim1 - off2;
    var fmid = off1 - off2;
    var bmid = lim1 - lim2;
    var odd = (fmid - bmid) & 1;
    var fmin = fmid;
    var fmax = fmid;
    var bmin = bmid;
    var bmax = bmid;
    var ec, d, i1, i2, prev1, best, dd, v, k;

    /*
     * Set initial diagonal values for both forward and backward path.
     */
    kvd[kvdf + fmid] = off1;
    kvd[kvdb + bmid] = lim1;

    for (ec = 1;; ec++) {
        var got_snake = 0;

        /*
         * We need to extent the diagonal "domain" by one. If the next
         * values exits the box boundaries we need to change it in the
         * opposite direction because (max - min) must be a power of two.
         * Also we initialize the external K value to -1 so that we can
         * avoid extra conditions check inside the core loop.
         */
        if (fmin > dmin) {
            fmin -= 1;
            kvd[kvdf + fmin - 1] = -1;
        } else {
            fmin++;
        }

        if (fmax < dmax) {
            fmax += 1
            kvd[kvdf + fmax + 1] = -1;
        } else {
            fmax--;
        }


        for (d = fmax; d >= fmin; d -= 2) {
            if (kvd[kvdf + d - 1] >= kvd[kvdf + d + 1]) {
                i1 = kvd[kvdf + d - 1] + 1;
            } else {
                i1 = kvd[kvdf + d + 1];
            }
            prev1 = i1;
            i2 = i1 - d;
            for (; i1 < lim1 && i2 < lim2 && ha1[i1] == ha2[i2]; i1++, i2++);
            if (i1 - prev1 > xenv.snake_cnt) {
                got_snake = 1;
            }
            kvd[kvdf + d] = i1;
            if (odd && bmin <= d && d <= bmax && kvd[kvdb + d] <= i1) {
                spl.i1 = i1;
                spl.i2 = i2;
                spl.min_lo = spl.min_hi = 1;
                return ec;
            }
        }


        /*
         * We need to extent the diagonal "domain" by one. If the next
         * values exits the box boundaries we need to change it in the
         * opposite direction because (max - min) must be a power of two.
         * Also we initialize the external K value to -1 so that we can
         * avoid extra conditions check inside the core loop.
         */
        if (bmin > dmin) {
            bmin--;
            kvd[kvdb + bmin - 1] = XDL_LINE_MAX;
        } else
            ++bmin;
        if (bmax < dmax) {
            bmax++;
            kvd[kvdb + bmax + 1] = XDL_LINE_MAX;
        } else
            --bmax;

        for (d = bmax; d >= bmin; d -= 2) {
            if (kvd[kvdb + d - 1] < kvd[kvdb + d + 1])
                i1 = kvd[kvdb + d - 1];
            else
                i1 = kvd[kvdb + d + 1] - 1;
            prev1 = i1;
            i2 = i1 - d;
            for (; i1 > off1 && i2 > off2 && ha1[i1 - 1] == ha2[i2 - 1]; i1--, i2--);
            if (prev1 - i1 > xenv.snake_cnt)
                got_snake = 1;
            kvd[kvdb + d] = i1;
            if (!odd && fmin <= d && d <= fmax && i1 <= kvd[kvdf + d]) {
                spl.i1 = i1;
                spl.i2 = i2;
                spl.min_lo = spl.min_hi = 1;
                return ec;
            }
        }

        if (need_min)
            continue;

        /*
         * If the edit cost is above the heuristic trigger and if
         * we got a good snake, we sample current diagonals to see
         * if some of the, have reached an "interesting" path. Our
         * measure is a function of the distance from the diagonal
         * corner (i1 + i2) penalized with the distance from the
         * mid diagonal itself. If this value is above the current
         * edit cost times a magic factor (XDL_K_HEUR) we consider
         * it interesting.
         */
        if (got_snake && ec > xenv.heur_min) {
            for (best = 0, d = fmax; d >= fmin; d -= 2) {
                dd = d > fmid ? d - fmid : fmid - d;
                i1 = kvd[kvdf + d];
                i2 = i1 - d;
                v = (i1 - off1) + (i2 - off2) - dd;

                if (v > 4 /*XDL_K_HEUR*/ * ec && v > best &&
                    off1 + xenv.snake_cnt <= i1 && i1 < lim1 &&
                    off2 + xenv.snake_cnt <= i2 && i2 < lim2) {
                    for (k = 1; ha1[i1 - k] == ha2[i2 - k]; k++)
                        if (k == xenv.snake_cnt) {
                            best = v;
                            spl.i1 = i1;
                            spl.i2 = i2;
                            break;
                        }
                }
            }
            if (best > 0) {
                spl.min_lo = 1;
                spl.min_hi = 0;
                return ec;
            }

            for (best = 0, d = bmax; d >= bmin; d -= 2) {
                dd = d > bmid ? d - bmid : bmid - d;
                i1 = kvd[kvdb + d];
                i2 = i1 - d;
                v = (lim1 - i1) + (lim2 - i2) - dd;

                if (v > 4 /*XDL_K_HEUR*/ * ec && v > best &&
                    off1 < i1 && i1 <= lim1 - xenv.snake_cnt &&
                    off2 < i2 && i2 <= lim2 - xenv.snake_cnt) {
                    for (k = 0; ha1[i1 + k] == ha2[i2 + k]; k++)
                        if (k == xenv.snake_cnt - 1) {
                            best = v;
                            spl.i1 = i1;
                            spl.i2 = i2;
                            break;
                        }
                }
            }
            if (best > 0) {
                spl.min_lo = 0;
                spl.min_hi = 1;
                return ec;
            }
        }

        /*
         * Enough is enough. We spent too much time here and now we collect
         * the furthest reaching path using the (i1 + i2) measure.
         */
        if (ec >= xenv.mxcost) {
            var fbest, fbest1, bbest, bbest1;

            fbest = fbest1 = -1;
            for (d = fmax; d >= fmin; d -= 2) {
                i1 = Math.min(kvd[kvdf + d], lim1);
                i2 = i1 - d;
                if (lim2 < i2)
                    i1 = lim2 + d, i2 = lim2;
                if (fbest < i1 + i2) {
                    fbest = i1 + i2;
                    fbest1 = i1;
                }
            }

            bbest = bbest1 = XDL_LINE_MAX;
            for (d = bmax; d >= bmin; d -= 2) {
                i1 = Math.max(off1, kvd[kvdb + d]);
                i2 = i1 - d;
                if (i2 < off2)
                    i1 = off2 + d, i2 = off2;
                if (i1 + i2 < bbest) {
                    bbest = i1 + i2;
                    bbest1 = i1;
                }
            }

            if ((lim1 + lim2) - bbest < fbest - (off1 + off2)) {
                spl.i1 = fbest1;
                spl.i2 = fbest - fbest1;
                spl.min_lo = 1;
                spl.min_hi = 0;
            } else {
                spl.i1 = bbest1;
                spl.i2 = bbest - bbest1;
                spl.min_lo = 0;
                spl.min_hi = 1;
            }
            return ec;
        }
    }
}


var xdl_recs_cmp = function(dd1, off1, lim1, dd2, off2, lim2, kvdf,
    kvdb, need_min, xenv, kvd) {

    var ha1 = dd1.ha;
    var ha2 = dd2.ha;

    /*
     * Shrink the box by walking through each diagonal snake (SW and NE).
     */
    for (; off1 < lim1 && off2 < lim2 && ha1[off1] == ha2[off2]; off1++, off2++);
    for (; off1 < lim1 && off2 < lim2 && ha1[lim1 - 1] == ha2[lim2 - 1]; lim1--, lim2--);

    /*
     * If one dimension is empty, then all records on the other one must
     * be obviously changed.
     */
    if (off1 == lim1) {
        var rchg2 = dd2.rchg;
        var rindex2 = dd2.rindex;

        for (; off2 < lim2; off2++)
            rchg2[rindex2[off2]] = 1;
    } else if (off2 == lim2) {
        var rchg1 = dd1.rchg;
        var rindex1 = dd1.rindex;

        for (; off1 < lim1; off1++)
            rchg1[rindex1[off1]] = 1;
    } else {
        var spl = {};
        spl.i1 = spl.i2 = 0;

        /*
         * Divide ...
         */
        if (xdl_split(ha1, off1, lim1, ha2, off2, lim2, kvdf, kvdb, need_min, spl,
                xenv, kvd) < 0) {

            return -1;
        }

        /*
         * ... et Impera.
         */
        if (xdl_recs_cmp(dd1, off1, spl.i1, dd2, off2, spl.i2, kvdf, kvdb,
                spl.min_lo, xenv, kvd) < 0 ||
            xdl_recs_cmp(dd1, spl.i1, lim1, dd2, spl.i2, lim2, kvdf, kvdb,
                spl.min_hi, xenv, kvd) < 0) {

            return -1;
        }
    }

    return 0;
}


var xdl_do_diff = function(mf1, mf2, xpp, xe) {

    var ndiags;
    var kvd, kvdf, kvdb;
    var xenv = {};
    var dd1, dd2;

    /* FIXME: This is apparently not executed and
    // at the momnet I don't want to impl more merge algos

    if(XDF_DIFF_ALG[xpp] == XDF_PATIENCE_DIFF)
    return xdl_do_patience_diff();

    if(XDF_DIGG_ALG[xpp] == XDF_HISTOGRAM_DIFF)
    return xdl_do_histogram_diff();
    */

    if (xdl_prepare_env(mf1, mf2, xpp, xe) < 0) {
        return -1;
    }

    /*
     * Allocate and setup K vectors to be used by the differential algorithm.
     * One is to store the forward path and one to store the backward path.
     */
    ndiags = xe.xdf1.nreff + xe.xdf2.nreff + 3;
    if (!(kvd = new Int32Array(2 * ndiags + 2)))
        return -1;

    kvdf = 0; // Instead of being a pointer, we need to make this an index... to kvd
    kvdb = 0 + ndiags; // same with this one (backwards pointer)
    kvdf += xe.xdf2.nreff + 1;
    kvdb += xe.xdf2.nreff + 1;

    xenv.mxcost = Math.max(Math.floor(Math.sqrt(ndiags)), 256); // XDL_MAX_COST_MIN
    xenv.snake_cnt = XDL_SNAKE_CNT;
    xenv.heur_min = XDL_HEUR_MIN;

    dd1 = new DD(xe.xdf1);
    dd2 = new DD(xe.xdf2);

    xdl_recs_cmp(dd1, 0, dd1.nrec, dd2, 0, dd2.nrec, kvdf, kvdb, (xpp.flags & 1) != 0, xenv, kvd)
}


var xdl_change_compact = function(xdf, xdfo, flags) {

    var g, go;
    var groupsize;
    var earliest_end, end_matching_other;

    g = new XdlGroup(xdf);
    go = new XdlGroup(xdfo);

    while (true) {
        if (g.end == g.start) {
            /* Move past the just-processed group: */
            if (group_next(xdf, g))
                break;
            if (group_next(xdfo, go))
                console.log("group sync broken moving to next group 1");
            continue;
        }

        /*
         * Now shift the change up and then down as far as possible in
         * each direction. If it bumps into any other changes, merge them.
         */
        do {
            groupsize = g.end - g.start;

            /*
             * Keep track of the last "end" index that causes this
             * group to align with a group of changed lines in the
             * other file. -1 indicates that we haven't found such
             * a match yet:
             */
            end_matching_other = -1;

            /* Shift the group backward as much as possible: */
            while (!group_slide_up(xdf, g, flags))
                if (group_previous(xdfo, go))
                    console.log("group sync broken sliding up");

            /*
             * This is this highest that this group can be shifted.
             * Record its end index:
             */
            earliest_end = g.end;

            if (go.end > go.start)
                end_matching_other = g.end;

            /* Now shift the group forward as far as possible: */
            while (1) {
                if (group_slide_down(xdf, g, flags))
                    break;
                if (group_next(xdfo, go))
                    console.log("group sync broken sliding down");

                if (go.end > go.start)
                    end_matching_other = g.end;
            }

        } while (groupsize != g.end - g.start);

        /*
         * If the group can be shifted, then we can possibly use this
         * freedom to produce a more intuitive diff.
         * The group is currently shifted as far down as possible, so the
         * heuristics below only have to handle upwards shifts.
         */
        if (g.end == earliest_end) {
            /* no shifting was possible  */
        } else if (end_matching_other != -1) {
            /*
             * Move the possibly merged group of changes back to line
             * up with the last group of changes from the other file
             * that it can align with.
             */
            while (go.end == go.start) {
                if (group_slide_up(xdf, g, flags))
                    console.log("match disappeared");
                if (group_previous(xdfo, go))
                    console.log("group sync broken sliding to match");
            }
        } else if (flags & XDF_INDENT_HEURISTIC) {
            /*
             * Indent heuristic: a group of pure add/delete lines
             * implies two splits, one between the end of the "before"
             * context and the start of the group, and another between
             * the end of the group and the beginning of the "after"
             * context. Some splits are aesthetically better and some
             * are worse. We compute a badness "score" for each split,
             * and add the scores for the two splits to define a
             * "score" for each position that the group can be shifted
             * to. Then we pick the shift with the lowest score.
             */
            var shift, best_shift = -1;
            var best_score = splitScore();

            for (shift = earliest_end; shift <= g.end; shift++) {
                var m = new SplitMeasurement();
                var score = new SplitScore();

                measure_split(xdf, shift, m);
                score_add_split(m, score);
                measure_split(xdf, shift - groupsize, m);
                score_add_split(m, score);
                if (best_shift == -1 || score_cmp(score, best_score) <= 0) {
                    best_score.effective_indent = score.effective_indent;
                    best_score.penalty = score.penalty;
                    best_shift = shift;
                }
            }

            while (g.end > best_shift) {
                if (group_slide_up(xdf, g, flags))
                    console.log("best shift unreached");
                if (group_previous(xdfo, go))
                    console.log("group sync broken sliding to blank line");
            }
        }

        //FIXME: this used to be a label and I had to inline it 
        //next: 
        // Move past the just-processed group
        if (group_next(xdf, g))
            break;
        if (group_next(xdfo, go))
            console.log("group sync broken moving to next group");
    }

    if (!group_next(xdfo, go))
        console.log("group sync broken at end of file");

    return 0;

}


/*
 * Compute a badness score for the hypothetical split whose measurements are
 * stored in m. The weight factors were determined empirically using the tools
 * and corpus described in
 *
 *     https://github.com/mhagger/diff-slider-tools
 *
 * Also see that project if you want to improve the weights based on, for
 * example, a larger or more diverse corpus.
 */
var score_add_split = function(m, s) {
    /*
     * A place to accumulate penalty factors (positive makes this index more
     * favored):
     */
    var post_blank, total_blank, indent, any_blanks;

    if (m.pre_indent == -1 && m.pre_blank == 0)
        s.penalty += START_OF_FILE_PENALTY;

    if (m.end_of_file)
        s.penalty += END_OF_FILE_PENALTY;

    /*
     * Set post_blank to the number of blank lines following the split,
     * including the line immediately after the split:
     */
    post_blank = (m.indent == -1) ? 1 + m.post_blank : 0;
    total_blank = m.pre_blank + post_blank;

    /* Penalties based on nearby blank lines: */
    s.penalty += TOTAL_BLANK_WEIGHT * total_blank;
    s.penalty += POST_BLANK_WEIGHT * post_blank;

    if (m.indent != -1)
        indent = m.indent;
    else
        indent = m.post_indent;

    any_blanks = (total_blank != 0);

    /* Note that the effective indent is -1 at the end of the file: */
    s.effective_indent += indent;

    if (indent == -1) {
        /* No additional adjustments needed. */
    } else if (m.pre_indent == -1) {
        /* No additional adjustments needed. */
    } else if (indent > m.pre_indent) {
        /*
         * The line is indented more than its predecessor.
         */
        s.penalty += any_blanks ?
            RELATIVE_INDENT_WITH_BLANK_PENALTY :
            RELATIVE_INDENT_PENALTY;
    } else if (indent == m.pre_indent) {
        /*
         * The line has the same indentation level as its predecessor.
         * No additional adjustments needed.
         */
    } else {
        /*
         * The line is indented less than its predecessor. It could be
         * the block terminator of the previous block, but it could
         * also be the start of a new block (e.g., an "else" block, or
         * maybe the previous block didn't have a block terminator).
         * Try to distinguish those cases based on what comes next:
         */
        if (m.post_indent != -1 && m.post_indent > indent) {
            /*
             * The following line is indented more. So it is likely
             * that this line is the start of a block.
             */
            s.penalty += any_blanks ?
                RELATIVE_OUTDENT_WITH_BLANK_PENALTY :
                RELATIVE_OUTDENT_PENALTY;
        } else {
            /*
             * That was probably the end of a block.
             */
            s.penalty += any_blanks ?
                RELATIVE_DEDENT_WITH_BLANK_PENALTY :
                RELATIVE_DEDENT_PENALTY;
        }
    }
}


/*
 * Move g to describe the next (possibly empty) group in xdf and return 0. If g
 * is already at the end of the file, do nothing and return -1.
 */
var group_next = function(xdf, g) {
    if (g.end == xdf.nrec)
        return -1;

    g.start = g.end + 1;
    for (g.end = g.start; xdf.rchg[g.end]; g.end++)
    ;

    return 0;
}


/*
 * Move g to describe the previous (possibly empty) group in xdf and return 0.
 * If g is already at the beginning of the file, do nothing and return -1.
 */
var group_previous = function(xdf, g) {
    if (g.start == 0)
        return -1;

    g.end = g.start - 1;
    for (g.start = g.end; xdf.rchg[g.start - 1]; g.start--)
    ;

    return 0;
}


/*
 * If g can be slid toward the end of the file, do so, and if it bumps into a
 * following group, expand this group to include it. Return 0 on success or -1
 * if g cannot be slid down.
 */
var group_slide_down = function(xdf, g, flags) {
    if (g.end < xdf.nrec &&
        recs_match(xdf.recs[g.start], xdf.recs[g.end], flags)) {
        xdf.rchg[g.start++] = 0;
        xdf.rchg[g.end++] = 1;

        while (xdf.rchg[g.end])
            g.end++;

        return 0;
    } else {
        return -1;
    }
}


var group_slide_up = function(xdf, g, flags) {
    if (g.start > 0 && recs_match(xdf.recs[g.start - 1], xdf.recs[g.end - 1], flags)) {
        xdf.rchg[--g.start] = 1;
        xdf.rchg[--g.end] = 0;

        while (xdf.rchg[g.start - 1])
            g.start--;

        return 0;
    } else {
        return -1;
    }
}


var recs_match = function(rec1, rec2, flags) {
    // FIXME: this memory based comparison may not be the bestest of them all
    return (rec1.ha == rec2.ha &&
        xdl_recmatch(rec1.ptr, rec2));
}


function Xch(xscr, i1, i2, chg1, chg2) {
    this.next = xscr;
    this.i1 = i1;
    this.i2 = i2;
    this.chg1 = chg1;
    this.chg2 = chg2;
    this.ignore = 0;
}


var xdl_build_script = function(xe, xscr) {
    var cscr = null;
    var xch;
    var rchg1 = xe.xdf1.rchg;
    var rchg2 = xe.xdf2.rchg;
    var i1, i2, l1, l2;

    // Trivial. Collects "groups" of changes and creates an edit script.
    for (i1 = xe.xdf1.nrec, i2 = xe.xdf2.nrec; i1 >= 0 || i2 >= 0; i1--, i2--) {
        if (rchg1[i1 - 1] || rchg2[i2 - 1]) {
            for (l1 = i1; rchg1[i1 - 1]; i1--);
            for (l2 = i2; rchg2[i2 - 1]; i2--);

            cscr = new Xch(cscr, i1, i2, l1 - i1, l2 - i2);
        }
    }

    // TODO: Take away all of this vestigial memory management
    xscr = cscr;

    return xscr;
}
