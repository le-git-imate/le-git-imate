"use strict";

var xdl_guess_lines = function(mf, sample) {

    var nl = 0,
        size = mf.size,
        tsize = 0;

    var data, cur, _top;

    data = mf.ptr.reduce(function(acc, value) {
        return acc + String.fromCharCode(value);
    }, "");

    cur = data.indexOf("\n");
    while (cur != -1) {
        nl++;
        cur = data.indexOf("\n", cur + 1)
    }

    //tsize += _top;
    //if (nl != 0 && tsize != 0)
    //nl = mf.size / Math.floor(tsize / nl);
    //nl = xdml_mmfile_size(mf) / (tsize / nl);

    return nl + 1;
}


var xdl_hashbits = function(size) {
    var val = 1,
        bits = 0;

    /* NOTE, this 8 used to be CHAR_BIT */
    for (; val < size && bits < 8 * 8; val <<= 1, bits++);
    return bits ? bits : 1;
}


var xdl_hash_record = function(i, data, _top, flags) {
    var ha = 5381;
    var ptr = data;

    // FIXME: if this doesn't work for word-by-word examples
    // we need to have an offset value in the record object
    for (i; i < _top && ptr[i] != '\n'.charCodeAt(0); i++) {
        ha += (ha << 5);
        ha ^= ptr[i];
    }

    return [ha, i];
}


var xdl_recmatch = function(line, rec) {

    // FIXME: if this doesn't work for word-by-word examples we need to have an
    // offset value in the record object.
    for (var i = 0; i < rec.size; i++) {
        if (rec.ptr[i] != line[i])
            return false;
    }
    return true;
}


/* FIXME: this part doesn't seem to be called.
var xdl_hash_record_with_whitespace = function(data, _top, flags) {

  var ha = 5381;
  ptr = data;

    var 

  // FIXME: this for is probably iterating over a line.
  for (var i = 0; i < _top.length && ptr[i] != '\n'; i++) {
    if (XDL_ISSPACE(*ptr)) {
      const char *ptr2 = ptr;
      int at_eol;
      while (ptr + 1 < top && XDL_ISSPACE(ptr[1])
          && ptr[1] != '\n')
        ptr++;
      at_eol = (top <= ptr + 1 || ptr[1] == '\n');
      if (flags & XDF_IGNORE_WHITESPACE)
        ; /* already handled 
      else if (flags & XDF_IGNORE_WHITESPACE_CHANGE
         && !at_eol) {
        ha += (ha << 5);
        ha ^= (unsigned long) ' ';
      }
      else if (flags & XDF_IGNORE_WHITESPACE_AT_EOL
         && !at_eol) {
        while (ptr2 != ptr + 1) {
          ha += (ha << 5);
          ha ^= (unsigned long) *ptr2;
          ptr2++;
        }
      }
      continue;
    }
    ha += (ha << 5);
    ha ^= (unsigned long) *ptr;
  }
  *data = ptr < top ? ptr + 1: ptr;

  return ha;
}
*/
