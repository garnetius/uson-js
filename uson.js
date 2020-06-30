/* ================================= $ J $ =====================================
// USON parser and generator implemented in JavaScript.
// -------------------------------------------------------------------------- */

"use strict";

/* =============================================================================
// Types
// -----------------------------------------------------------------------------
// Wrapper around regular object to help with parsing */
class USONObject extends Object {
get [Symbol.toStringTag]() {
  return "USONObject";
}

constructor (value) {
  super (value);
}}

/* ===--------------------------------------------------------------------------
// Wrapper around regular array */
class USONArray extends Array {
get [Symbol.toStringTag]() {
  return "USONArray";
}

constructor (...args) {
  super (...args);
}}

/* ===--------------------------------------------------------------------------
// Look up the index of the value in a sorted array using binary search */
function binarySearch (key, cmpFunc=binarySearch.compare) {
  let idx = 0;
  let start = 0;
  let end = this.length;

  while (start !== end) {
    idx = Math.floor ((start + end) / 2);

    const cmp = cmpFunc (key, this[idx]);

    if (cmp < 0) end = idx;
    else if (cmp > 0) start = idx + 1;
    else return idx;
  }

  /* Return the negative value if the provided key
  // wasn't found. This value converted to positive
  // using `Math.abs()` would be the exact index
  // at which the key can be inserted
  // to keep the array sorted. */
  return -(idx + (end === this.length));
}

/* ===--------------------------------------------------------------------------
// Default comparison function expects two numbers */
Object.defineProperty (binarySearch, "compare", {value: (a, b) => a - b});

/* ===--------------------------------------------------------------------=== */

if (USONArray.prototype.binarySearch === undefined) {
  Object.defineProperty (USONArray.prototype, "binarySearch", {
    value: binarySearch
  });
}

if (USONArray.prototype.lastIndex === undefined) {
  Object.defineProperty (USONArray.prototype, "lastIndex", {
    get: function() {return this.length - 1;}
  });
}

if (USONArray.prototype.first === undefined) {
  Object.defineProperty (USONArray.prototype, "first", {
    value: function() {return this[0];}
  });
}

if (USONArray.prototype.last === undefined) {
  Object.defineProperty (USONArray.prototype, "last", {
    value: function() {return this[this.lastIndex];}
  });
}

if (USONArray.prototype.insert === undefined) {
  Object.defineProperty (USONArray.prototype, "insert", {
    value: function (idx, ...items) {
      this.splice (idx, 0, ...items);
      return this.length;
    }
  });
}

if (USONArray.prototype.remove === undefined) {
  Object.defineProperty (USONArray.prototype, "remove", {
    value: function (idx, num) {return this.splice (idx, num);}
  });
}

/* ===--------------------------------------------------------------------------
// This also holds the `delimitingIdentifier` property
// which is a delimiting identifier string */
class USONVerbatim extends String {
get [Symbol.toStringTag]() {
  return "USONVerbatim";
}

constructor (string, delimitingIdentifier="") {
  super (string);

  Object.defineProperty (this, "delimitingIdentifier", {
    value: delimitingIdentifier,
    writable: true
  });
}}

/* ===--------------------------------------------------------------------------
// This could be `Uint8Array`, but we want it to be
// easily `JSON.stringify()`-able */
class USONData extends String {
get [Symbol.toStringTag]() {
  return "USONData";
}

/* ===--------------------------------------------------------------------------
// Binary representation */
toBinary() {
  let binary = new Uint8Array(this.length);

  Array.prototype.forEach.call (binary, function (elmnt, idx, arr) {
    arr[idx] = this.charCodeAt(idx);
  }, this);

  return binary;
}

constructor (string, mediaType="") {
  super (string);

  Object.defineProperty (this, "mediaType", {
    value: mediaType,
    writable: true
  });
}}

/* ===--------------------------------------------------------------------------
// Distinguish from double-quoted string */
class USONIdentifier extends String {
get [Symbol.toStringTag]() {
  return "USONIdentifier";
}

constructor (string, valid=false) {
  if (!valid) {
    if (!USON.isIdentifier (string)) {
      throw new SyntaxError();
    }
  }

  super (string);
}}

/* ===--------------------------------------------------------------------------
// Enforce integral number type */
function Integer (val) {
  return val | 0;
}

/* =============================================================================
// Parser
// -------------------------------------------------------------------------- */

class USONParser {
get [Symbol.toStringTag]() {
  return "USONParser";
}

/* ===--------------------------------------------------------------------------
// Error handler */
parseError (err, pos) {
  this.err = err;
  this.col = pos - this.linePos + 1;
  this.pos = pos + 1;
}

/* ===--------------------------------------------------------------------------
// Single character escape sequence: \" */
parseEscapeSingle (chr, idx) {
  switch (chr) {
  case '"': break;
  case '\\': break;
  case 'n': chr = '\n'; break;
  /* JSON compatibility */
  case 't': chr = '\t'; break;
  case 'r': chr = '\r'; break;
  case 'b': chr = '\b'; break;
  case 'f': chr = '\f'; break;
  case '/': break;
  default: return this.parseError (USON.error.stringEscape, idx);
  }

  this.pos = idx + 1;

  return chr;
}

/* ===--------------------------------------------------------------------------
// JSON Unicode code point escape sequence: \u2740 */
parseEscapeUnicodeJSON (idx) {
  const start = idx;
  const len = this.size;
  const uson = this.input;

  /* At least four hexadecimal digits must be present */
  if (len - start < 4) {
    return this.parseError (USON.error.unexpectedEnd, len);
  }

  /* Get the code point */
  let codep = parseInt (uson.substr (start, 4), 16);

  if (Number.isNaN (codep)) {
    return this.parseError (USON.error.escapeUnicode, start);
  }

  idx += 4;

  /* Check if it's a surrogate */
  if ((codep & 0xF800) === 0xD800) {
    /* Must be a low surrogate */
    if ((codep & 0xFC00) !== 0xDC00) {
      return this.parseError (USON.error.escapeUnicode, start);
    }

    /* Get the high surrogate */
    if (len - start < 10) {
      return this.parseError (USON.error.unexpectedEnd, len);
    }

    if (uson[4] !== '\\' || uson[5] !== 'u') {
      return this.parseError (USON.error.unexpectedToken, start);
    }

    idx += 6;

    const high = parseInt (uson.substr (start + 6, 4), 16);

    if (Number.isNaN (high)) {
      return this.parseError (USON.error.escapeUnicode, idx);
    }

    if ((codep & 0xFC00) !== 0xD800) {
      return this.parseError (USON.error.escapeUnicode, idx);
    }

    codep = (((high & 0x3FF) << 10) + 0x10000) | (codep & 0x3FF);
  }

  if (codep > 0x10FFFF) {
    return this.parseError (USON.error.escapeUnicode, start);
  }

  this.pos = idx;

  return String.fromCodePoint (codep);
}

/* ===--------------------------------------------------------------------------
// Unicode code point escape sequence: \u{1F602} */
parseEscapeUnicode (idx) {
  const start = idx;
  const len = this.size;
  const uson = this.input;
  const regex = USON.pattern.unicode;

  /* Find where the Unicode sequence ends */
  regex.lastIndex = start;

  const match = regex.exec (uson);

  if (match === null) {
    return this.parseError (USON.error.unexpectedEnd, len);
  }

  /* It must end with a closing brace and must have
  // at least one hexadecimal digit */
  const end = match.index;
  const chr = uson[end];

  if (start === end || chr !== '}') {
    return this.parseError (USON.error.unexpectedToken, end);
  }

  /* Parse the Unicode code point */
  const codep = parseInt (uson.substring (start, end), 16);

  /* Check if the code point value is invalid or is out of range */
  if (Number.isNaN (codep) || codep > 0x10FFFF) {
    return this.parseError (USON.error.escapeUnicode, end);
  }

  this.pos = end + 1;

  return String.fromCodePoint (codep);
}

/* ===--------------------------------------------------------------------------
// Escape sequence: \... */
parseStringEscape (idx) {
  const len = this.size;
  const uson = this.input;

  if (idx === len) {
    return this.parseError (USON.error.unexpectedEnd, len);
  }

  let chr = uson[idx];

  /* Check if this is a Unicode escape sequence */
  if (chr === 'u') {
    ++idx;

    if (idx === len) {
      return this.parseError (USON.error.unexpectedEnd, len);
    }

    /* Must be followed by an opening brace */
    chr = uson[idx];

    if (chr !== '{') {
      /* JSON compatibility */
      return this.parseEscapeUnicodeJSON (idx);
    }

    return this.parseEscapeUnicode (idx + 1);
  }

  /* It's a single character escape sequence */
  return this.parseEscapeSingle (chr, idx);
}

/* ===--------------------------------------------------------------------------
// Double-quoted string: "music" */
parseString (idx) {
  let str = "";
  const len = this.size;
  const uson = this.input;
  const regex = USON.pattern.string;

  while (true) {
    /* Recalibrate the pattern */
    regex.lastIndex = idx;

    /* Get to the next stop-character */
    const match = regex.exec (uson);

    if (match === null) {
      /* At least the closing double quote must be present */
      return this.parseError (USON.error.unexpectedEnd, len);
    }

    /* Assemble the string */
    const end = match.index;

    str += uson.substring (idx, end);
    idx = end;

    /* See what kind of stop-character it is */
    const chr = uson[idx];

    if (chr === '"') {
      /* End of string */
      this.pos = idx + 1;
      return str;
    } else if (chr === '\\') {
      /* Escape sequence */
      const seq = this.parseStringEscape (idx + 1);

      if (seq === undefined) {
        /* Bubble the error up */
        return;
      }

      str += seq;
    } else if (chr === '\x7f') {
      /* JSON compatibility */
      ++idx;
      str += '\x7f';

      continue;
    } else {
      /* Control character */
      return this.parseError (USON.error.string, idx);
    }

    idx = this.pos;
  }
}

/* ===--------------------------------------------------------------------------
// Identifier: opera */
parseIdentifier (key, idx) {
  const start = idx;
  const len = this.size;
  const uson = this.input;
  const regex = USON.pattern.identifier;

  if (start === len) {
    return this.parseError (USON.error.unexpectedEnd, len);
  }

  /* Get the stop-character */
  regex.lastIndex = start;

  let err, end;
  let match = regex.exec (uson);

  if (match === null) {
    err = false;
    end = len;
  } else {
    err = match.index === start;
    end = match.index;
  }

  if (err) {
    return this.parseError (USON.error.unexpectedToken, end);
  } else {
    /* Extract the identifier string */
    let ident = uson.substring (start, end);

    this.pos = end;

    if (!key) {
      /* Check if the identifier is a boolean, a null,
      // or a special floating point number */
      switch (ident) {
      case      "true": ident = true; break;
      case     "false": ident = false; break;
      case      "null": ident = null; break;
      case  "Infinity": ident = Infinity; break;
      case "+Infinity": ident = Infinity; break;
      case "-Infinity": ident =-Infinity; break;
      case       "NaN": ident = NaN; break;
      default: return new USONIdentifier(ident, true);
      }
    }

    return ident;
  }
}

/* ===--------------------------------------------------------------------------
// Number: 2.99792458e+8 */
parseNumber (idx) {
  const start = idx;
  const len = this.size;
  const uson = this.input;
  const regex = USON.pattern.number;

  if (start === len) {
    return this.parseError (USON.error.unexpectedEnd, len);
  }

  /* Find where the number ends */
  regex.lastIndex = start;

  let end;

  const match = regex.exec (uson);
  let isIdent = false;

  if (match === null) {
    end = len;
  } else {
    end = match.index;

    const chr = uson[end];

    /* Check if this is an identifier */
    if (USON.isIdentifierChar (chr)) {
      isIdent = true;
    }
  }

  /* Actually parse the number */
  let num = NaN;

  if (!isIdent) {
    num = parseFloat (uson.substring (start, end));
  }

  if (Number.isNaN (num)) {
    /* A number that has failed to parse due to *syntactic*
    // error becomes an identifier */
    return this.parseIdentifier (false, start);
  }

  this.pos = end;

  return num;
}

/* ===--------------------------------------------------------------------------
// Verbatim string delimiting identifier: !markdown */
parseVerbatimDelimiter (idx) {
  const start = idx;
  const len = this.size;
  const uson = this.input;
  const regex = USON.pattern.identifier;

  /* Shares valid characters with a regular identifier.
  // Scan until the new line character. */
  regex.lastIndex = start;

  const match = regex.exec (uson);

  if (match === null) {
    return this.parseError (USON.error.unexpectedEnd, len);
  }

  const end = match.index;
  const chr = uson[end];

  if (chr !== '\n') {
    return this.parseError (USON.error.unexpectedToken, end);
  }

  this.pos = end + 1;

  return uson.substring (start, end);
}

/* ===--------------------------------------------------------------------------
// Verbatim string: <!markdown\n...\n!markdown> */
parseVerbatim (idx) {
  const len = this.size;
  const uson = this.input;
  const delim = this.parseVerbatimDelimiter (idx);

  if (delim === undefined) {
    return;
  }

  idx = this.pos;

  const start = idx;
  const regex = USON.pattern.commentSingle;

  /* Find the new line immediately followed by the same
  // delimiting identifier and the closing angle bracket */
  while (true) {
    regex.lastIndex = idx;

    const match = regex.exec (uson);

    if (match === null) {
      return this.parseError (USON.error.unexpectedEnd, len);
    }

    const end = match.index;
    const chr = uson[end];

    if (chr === '\n') {
      if (len - end >= delim.length + 3) {
        if ((uson[end + 1] === '!') && (uson[end + 2 + delim.length] === '>')) {
          const sub = uson.substr (end + 2, delim.length);

          if (sub === delim) {
            this.pos = end + 2 + delim.length + 1;

            /* Wrap the string and save the delimiting identifier */
            return new USONVerbatim(uson.substring (start, end), delim);
          }
        }

        idx = end + 1;

        continue;
      }
    }

    return this.parseError (USON.error.unexpectedToken, end);
  }
}

/* ===--------------------------------------------------------------------------
// Media type: ?image/png? */
parseMedia (idx) {
  const start = idx;
  const len = this.size;
  const uson = this.input;
  const regex = USON.pattern.media;

  /* Find the closing question mark */
  regex.lastIndex = start;

  const match = regex.exec (uson);

  if (match === null) {
    return this.parseError (USON.error.unexpectedEnd, len);
  }

  const end = match.index;
  const chr = uson[end];

  if (chr !== '?') {
    return this.parseError (USON.error.unexpectedToken, end);
  }

  this.pos = end + 1;

  return uson.substring (start, end);
}

/* ===--------------------------------------------------------------------------
// Base64-encoded data: <?image/png?...> */
parseData (idx) {
  const returnData = () => {
    /* Wrap the data and save the media type */
    this.pos = idx + 1;
    return new USONData(decoded, media);
  };

  const len = this.size;
  const uson = this.input;

  if (idx === len) {
    return this.parseError (USON.error.unexpectedEnd, len);
  }

  /* Check if this is actually a verbatim string */
  const chr = uson[idx];

  if (chr === '!') {
    return this.parseVerbatim (idx + 1);
  }

  /* Get the media type if it's present */
  let media;

  if (chr === '?') {
    media = this.parseMedia (idx + 1);

    if (media === undefined) {
      return;
    }

    idx = this.pos;
  } else {
    return this.parseError (USON.error.noMedia, len);
  }

  /* Decode the data */
  const lut = USON.base64DecodeLut;
  let decoded = "";

  while (true) {
    /* Skip new line */
    if (uson[idx] === '\n') {
      ++idx;
    }

    /* Validate the input sequence */
    let code0 = uson.charCodeAt(idx + 0);
    let code1 = uson.charCodeAt(idx + 1);
    let code2 = uson.charCodeAt(idx + 2);
    let code3 = uson.charCodeAt(idx + 3);

    if ((code0 | code1 | code2 | code3) > 127) {
      return this.parseError (USON.error.base64Encoding, idx);
    }

    /* Check for non-alphabet characters
    // and the last sequence */
    code0 = lut[code0];
    code1 = lut[code1];
    code2 = lut[code2];
    code3 = lut[code3];

    const mask = code0 | code1 | code2 | code3;

    if (mask > 63 || len - idx < 4) {
      /* Trailing sequence */
      if (idx === len) {
        return this.parseError (USON.error.unexpectedEnd, len);
      }

      if (uson[idx] === '>') {
        /* Encoded data end */
        return returnData();
      }

      if ((code0 | code1) > 63 || len - idx < 2) {
        /* At least two more valid bytes must be present */
        return this.parseError (USON.error.base64Encoding, idx);
      }

      /* Decode the trailing sequence */
      idx += 2;
      decoded += String.fromCharCode ((code0 << 2) | (code1 >> 4));

      if (code2 < 64) {
        decoded += String.fromCharCode (0xFF & ((code1 << 4) | (code2 >> 2)));
      } else if (code2 === 64) {
        ++idx;
      } else if (code2 === 128) {
        return returnData();
      } else {
        return this.parseError (USON.error.base64Encoding, idx);
      }

      if (code3 === 64) {
        ++idx;
      } else if (code3 === 128) {
        return returnData();
      } else {
        return this.parseError (USON.error.base64Encoding, idx);
      }
    } else {
      /* Decode the sequence */
      decoded += String.fromCharCode ((code0 << 2) | (code1 >> 4));
      decoded += String.fromCharCode (0xFF & ((code1 << 4) | (code2 >> 2)));
      decoded += String.fromCharCode (0xFF & ((code2 << 6) |  code3));

      idx += 4;
    }
  }
}

/* ===--------------------------------------------------------------------------
// Array: [...] */
parseArray (idx) {
  const arr = new USONArray();
  const len = this.size;
  const uson = this.input;

  while (true) {
    const item = this.parseValue (idx);

    if (item === undefined) {
      /* Check if we've bumped into
      // the closing bracket */
      if (this.end) {
        this.end = false;
        return arr;
      } else {
        /* It's an error otherwise */
        return;
      }
    }

    arr.push (item);

    /* Skip delimiters: semicolons and/or whitespace */
    idx = this.skipWspace (this.pos);

    if (idx === len) {
      return this.parseError (USON.error.unexpectedEnd, len);
    }

    let sep;
    const chr = uson[idx];

    if (chr === ',') {
      sep = true;
      ++idx;
    } else if (chr === ']') {
      this.pos = idx + 1;
      return arr;
    } else {
      sep = this.sep;
    }

    if (!sep) {
      return this.parseError (USON.error.unexpectedToken, idx);
    }
  }
}

/* ===--------------------------------------------------------------------------
// Object: {...} */
parseObject (idx) {
  const len = this.size;
  const uson = this.input;
  const cfg = this.config;
  const isCfgRoot = this.isConf;

  if (isCfgRoot) {
    this.isConf = false;
  }

  let obj;

  if (cfg) {
    /* Since USON configuration allows duplicate keys
    // use an associative array to represent
    // UCFG objects */
    obj = new USONArray();
  } else {
    obj = new USONObject();
  }

  while (true) {
    /* Get the key */
    idx = this.skipWspace (idx);

    if (idx === len) {
      return this.parseError (USON.error.unexpectedEnd, len);
    }

    let chr = uson[idx];

    /* Check for object end */
    let key;

    if (!isCfgRoot && chr === '}') {
      this.pos = idx + 1;

      if (this.reviver !== null) {
        obj = this.reviver.call (obj, "", obj);

        if (obj === undefined) {
          /* Distinguish between the parsing failure
          // and the filtered out object */
          return this.reviver;
        }
      }

      return obj;
    } else if (chr === '"') {
      key = this.parseString (idx + 1);
    } else {
      key = this.parseIdentifier (true, idx);
    }

    if (key === undefined) {
      return;
    }

    /* Check for colon */
    idx = this.skipWspace (this.pos);

    if (idx === len) {
      return this.parseError (USON.error.unexpectedEnd, len);
    }

    let colon;

    chr = uson[idx];

    if (chr === ':') {
      ++idx;
      colon = true;
    } else {
      colon = false;
    }

    let sep;

    if (!colon) {
      sep = this.sep;
    }

    /* Get the value */
    let value = this.parseValue (idx);

    if (value === undefined) {
      return;
    }

    if (!colon) {
      /* The colon character can be omitted if the value is
      // a USON object or an array, but only if there is
      // whitespace in-between the key */
      let err;

      if (value instanceof USONObject || Array.isArray (value)) err = !sep;
      else err = true;

      if (err) {
        return;
      }
    }

    /* Set the key/value pair */
    if (this.reviver !== null) {
      /* Filtered out object */
      if (value === this.reviver) value = undefined;
      else value = this.reviver.call (obj, key, value);
    }

    if (value !== undefined) {
      if (cfg) obj.push ([key, value]);
      else obj[key] = value;
    }

    /* Skip delimiters */
    idx = this.skipWspace (this.pos);

    if (idx === len) {
      if (isCfgRoot) {
        this.pos = len;
        return obj;
      }

      return this.parseError (USON.error.unexpectedEnd, len);
    }

    chr = uson[idx];

    if (chr === ';' || /* JSON compatibility */ chr === ',') {
      sep = true;
      ++idx;
    } else if (!isCfgRoot && chr === '}') {
      this.pos = idx + 1;

      if (this.reviver !== null) {
        obj = this.reviver.call (obj, "", obj);

        if (obj === undefined) {
          return this.reviver;
        }
      }

      return obj;
    } else {
      sep = this.sep;
    }

    if (!sep) {
      return this.parseError (USON.error.unexpectedToken, idx);
    }
  }
}

/* ===--------------------------------------------------------------------------
// Multiline comment: (...) */
skipCommentMulti (idx) {
  let depth = 1;
  const len = this.size;
  const uson = this.input;
  const regex = USON.pattern.commentMulti;

  while (true) {
    /* Find where the multiline comment ends */
    regex.lastIndex = idx;

    const match = regex.exec (uson);

    if (match === null) {
      return len;
    }

    idx = match.index;

    const chr = uson[idx];

    if (chr === '\n') {
      ++idx;
      ++this.line;
      this.linePos = idx;

      continue;
    } else if (chr === '(') {
      /* Nested multiline comment */
      ++depth;
    } else if (chr === ')') {
      /* Multiline comment end */
      ++idx;
      --depth;

      if (depth === 0) {
        return idx;
      }

      continue;
    } else {
      /* Invalid character inside comment */
      return idx;
    }

    ++idx;
  }
}

/* ===--------------------------------------------------------------------------
// Single line comment: #... */
skipCommentSingle (idx) {
  const len = this.size;
  const uson = this.input;
  const regex = USON.pattern.commentSingle;

  /* Find the end of the line */
  regex.lastIndex = idx;

  const match = regex.exec (uson);

  if (match === null) {
    return len;
  }

  idx = match.index;
  const chr = uson[idx];

  if (chr === '\n') {
    ++idx;
    ++this.line;
    this.linePos = idx;
  }

  return idx;
}

/* ===--------------------------------------------------------------------------
// Skip whitespace and comments */
skipWspace (idx) {
  let sep = false;
  const len = this.size;
  const uson = this.input;
  const regex = USON.pattern.wspace;

  while (true) {
    regex.lastIndex = idx;

    const match = regex.exec (uson);

    if (match === null) {
      idx = len;
      break;
    }

    /* Check if any whitespace have been skipped */
    if (match.index !== idx) {
      sep = true;
    }

    idx = match.index;

    /* Skip the comments. Semantically comments
    // are treated just like whitespace:
    // as if they don't exist. */
    let chr = uson[idx];

    if (chr === '\n') {
      /* Track the line and column numbers */
      ++idx;
      ++this.line;
      this.linePos = idx;

      continue;
    } else if (chr === '\t' || chr === '\r') {
      /* JSON compatibility */
      ++idx;
      continue;
    } else if (chr === '#') {
      /* Single line comment */
      idx = this.skipCommentSingle (idx + 1);
      sep = true;

      continue;
    } else if (chr === '(') {
      /* Multiline comment */
      idx = this.skipCommentMulti (idx + 1);
      sep = true;

      continue;
    }

    break;
  }

  /* This flag is used to check if USON object key/value pairs
  // and USON array items are properly separated from each other
  // by whitespace when the semicolon separator is absent */
  this.sep = sep;

  return idx;
}

/* ===--------------------------------------------------------------------------
// Parse the value */
parseValue (idx) {
  const len = this.size;
  const uson = this.input;

  idx = this.skipWspace (idx);

  if (idx === len) {
    return;
  }

  const chr = uson[idx];

  switch (chr) {
  case '{': return this.parseObject (idx + 1);
  case '[': return this.parseArray (idx + 1);
  case '<': return this.parseData (idx + 1);
  case '"': return this.parseString (idx + 1);
  case ']':
    /* Catch the closing array bracket */
    this.pos = idx + 1;
    this.end = true;

    return;
  default:
    /* USON identifier is a number which failed
    // to parse due to *syntactic* difference
    // from an actual valid number */
    return this.parseNumber (idx);
  }
}

/* ===--------------------------------------------------------------------------
// Parse the input */
parse() {
  if (this.config) return this.parseObject (this.pos);
  return this.parseValue (this.pos);
}

/* ===--------------------------------------------------------------------------
// Initialize the parser */
constructor (input, reviver=null, config=false) {
  Object.defineProperties (this, {
    input: {value: input},
    reviver: {value: reviver},
    config: {value: config},
    size: {value: input.length},
    isConf: {value: config, writable: true},
    err: {value: USON.error.ok, writable: true},
    end: {value: false, writable: true},
    sep: {value: false, writable: true},
    line: {value: 1, writable: true},
    col: {value: 0, writable: true},
    linePos: {value: 0, writable: true},
    pos: {value: 0, writable: true}
  });
}}

/* =============================================================================
// Formatter
// -------------------------------------------------------------------------- */

class USONFormatter {
get [Symbol.toStringTag]() {
  return "USONFormatter";
}

/* ===--------------------------------------------------------------------------
// Filter the object property through the replacer */
filter (owner, key, val) {
  if (this.replacer === null) return val;
  if (val === undefined) return;

  /* Look for the replacement function */
  if (val.toUSON !== undefined) val = val.toUSON.call (val, key);
  else if (val.toJSON !== undefined) val = val.toJSON.call (val, key);

  /* Replace the value */
  if (Array.isArray (this.replacer)) {
    if (this.replacer.indexOf (key) === -1) {
      return;
    }
  } else {
    val = this.replacer.call (owner, key, val);
  }

  return val;
}

/* ===--------------------------------------------------------------------=== */

stringifyString (str) {
  let out = '"';
  let idx = 0;
  const regex = USON.pattern.string;

  while (true) {
    /* Find the next non-string character */
    const match = regex.exec (str);

    if (match === null) {
      /* Output the rest of the string as is */
      out += str.substring (idx);
      break;
    }

    /* Output the part of the string before
    // the offending character */
    const end = match.index;

    out += str.substring (idx, end);

    /* Output the proper escape sequence */
    const chr = str[end];

    switch (chr) {
    case '"':
      out += "\\\"";
      break;
    case '\\':
      out += "\\\\";
      break;
    case '\n':
      out += "\\n";
      break;
    default:
      /* Unicode escape sequence */
      const codep = chr.codePointAt(0);
      const hex = codep.toString (16).toUpperCase();

      out += "\\u{" + hex + '}';
    }

    idx = regex.lastIndex;
  }

  this.output += out + '"';
}

/* ===--------------------------------------------------------------------=== */

stringifyIdentifier (ident) {
  this.output += ident;
}

/* ===--------------------------------------------------------------------=== */

stringifyKey (key) {
  if (USON.isIdentifier (key)) this.stringifyIdentifier (key);
  else this.stringifyString (key);
}

/* ===--------------------------------------------------------------------=== */

stringifyNumber (num) {
  /* Check for a special number value */
  if (isFinite (num)) {
    this.output += num.toString();
  } else if (Number.isNaN (num)) {
    this.output += "NaN";
  } else if (num > 0) {
    this.output += "Infinity";
  } else {
    this.output += "-Infinity";
  }
}

/* ===--------------------------------------------------------------------=== */

stringifyBoolean (bool) {
  if (bool) this.output += "true";
  else this.output += "false";
}

/* ===--------------------------------------------------------------------=== */

stringifyNull() {
  this.output += "null";
}

/* ===--------------------------------------------------------------------=== */

stringifyVerbatim (verb) {
  const delim = verb.delimitingIdentifier;

  this.output += "<!" + delim + '\n'
  + verb + '\n' + '!' + delim + '>';
}

/* ===--------------------------------------------------------------------=== */

stringifyData (data) {
  let idx = 0;
  let out = '<';
  const indent = this.indent;
  const rem = data.length % 3;
  const end = data.length - rem;
  const lut = USON.base64EncodeLut;
  const pad = USON.base64EncodePad;
  const media = data.mediaType;

  /* Check for media type */
  if (media.length !== 0) {
    out += '?' + media + '?';
  }

  /* Encode the data */
  for (; idx !== end; idx += 3) {
    if (indent !== 0) {
      /* Break at 80th column */
      if ((idx % 60) === 0) {
        out += '\n';
      }
    }

    const code0 = data.charCodeAt(idx + 0);
    const code1 = data.charCodeAt(idx + 1);
    const code2 = data.charCodeAt(idx + 2);

    out += lut[code0 >> 2];
    out += lut[((code0 << 4) & 0x3F) | (code1 >> 4)];
    out += lut[((code1 << 2) & 0x3F) | (code2 >> 6)];
    out += lut[code2 & 0x3F];
  }

  /* Remainder and padding characters */
  switch (rem) {
  case 2: {
    const code0 = data.charCodeAt(idx + 0);
    const code1 = data.charCodeAt(idx + 1);

    out += lut[code0 >> 2];
    out += lut[((code0 << 4) & 0x3F) | (code1 >> 4)];
    out += lut[(code1 << 2) & 0x3F];

    if (false) {
      out += pad;
    }

    break;
  }
  case 1: {
    const code0 = data.charCodeAt(idx);

    out += lut[code0 >> 2];
    out += lut[(code0 << 4) & 0x3F];

    if (false) {
      out += pad;
      out += pad;
    }

    break;
  }}

  this.output += out;

  if (indent !== 0) {
    this.output += '\n';
  }

  this.output += '>';
}

/* ===--------------------------------------------------------------------=== */

stringifyArray (arr, depth) {
  const indent = this.indent;

  this.output += '[';
  ++depth;

  /* Iterate over the values */
  for (let idx = 0; idx !== arr.length; ++idx) {
    const val = this.filter (arr, idx, arr[idx]);

    /* Don't output undefined values */
    if (val !== undefined) {
      if (indent !== 0) {
        this.output += '\n';
      }

      this.stringifyValue (val, true, depth);

      if (indent === 0 && idx !== arr.length - 1) {
        this.output += ',';
      }
    }
  }

  --depth;

  /* Don't indent inside an empty array */
  if (indent !== 0 && arr.length !== 0) {
    this.output += '\n';
    this.stringifyIndent (depth);
  }

  this.output += ']';
}

/* ===--------------------------------------------------------------------=== */

stringifyObject (obj, depth) {
  const indent = this.indent;

  this.output += '{';
  ++depth;

  /* Iterate over the keys */
  const items = Object.entries (obj);

  for (let idx = 0; idx !== items.length; ++idx) {
    let [key, value] = items[idx];

    if (typeof key !== "string") {
      /* Skip symbols */
      continue;
    }

    value = this.filter (obj, key, value);

    if (value !== undefined) {
      if (indent !== 0) {
        this.output += '\n';
        this.stringifyIndent (depth);
      }

      this.stringifyKey (key);
      this.output += ':';
      this.stringifyValue (value, false, depth);

      if (indent === 0 && idx !== items.length - 1) {
        this.output += ';';
      }
    }
  }

  --depth;

  if (indent !== 0 && items.length !== 0) {
    this.output += '\n';
    this.stringifyIndent (depth);
  }

  this.output += '}';
}

/* ===--------------------------------------------------------------------=== */

stringifyMap (map, depth) {
  const indent = this.indent;

  this.output += '{';
  ++depth;

  const items = map.entries();
  let idx = 0;

  for (let [key, val] of items) {
    if (typeof key !== "string" && !(key instanceof String)) {
      /* Skip non-string keys */
      ++idx;
      continue;
    }

    val = this.filter (map, key, val);

    if (val !== undefined) {
      if (indent !== 0) {
        this.output += '\n';
        this.stringifyIndent (depth);
      }

      this.stringifyKey (key);
      this.output += ':';
      this.stringifyValue (val, false, depth);

      if (indent === 0 && idx !== map.size - 1) {
        this.output += ';';
      }
    }

    ++idx;
  }

  --depth;

  if (indent !== 0 && map.size !== 0) {
    this.output += '\n';
    this.stringifyIndent (depth);
  }

  this.output += '}';
}

/* ===--------------------------------------------------------------------=== */

stringifyValue (val, inArr, depth) {
  if (this.indent !== 0) {
    if (inArr) {
      this.stringifyIndent (depth);
    } else {
      /* Space in-between a key/value pair */
      this.output += ' ';
    }
  }

  switch (typeof val) {
  case "object":
    if (Array.isArray (val)) {
      this.stringifyArray (val, depth);
    } else if (val instanceof Set) {
      /* Turn the set into array */
      this.stringifyArray ([...val], depth);
    } else if (val instanceof Map) {
      /* This is same as `stringifyObject()`, but for `Map` */
      this.stringifyMap (val, depth);
    } else if (val instanceof RegExp) {
      /* Neat way to represent regular expressions */
      this.stringifyVerbatim (new USONVerbatim (val.toString(), "regex"));
    } else if (val instanceof Function) {
      /* And functions */
      this.stringifyVerbatim (new USONVerbatim (val.toString(), "js"));
    } else if (val instanceof String) {
      /* Handle USON-specific string types */
      if (val instanceof USONIdentifier) this.stringifyIdentifier (val);
      else if (val instanceof USONVerbatim) this.stringifyVerbatim (val);
      else if (val instanceof USONData) this.stringifyData (val);
      else this.stringifyString (val.valueOf());
    } else if (val instanceof Number) {
      this.stringifyNumber (val.valueOf());
    } else if (val instanceof Boolean) {
      this.stringifyBoolean (val.valueOf());
    } else if (val === null) {
      this.stringifyNull();
    } else {
      this.stringifyObject (val, depth);
    }

    break;
  case "string":
    this.stringifyString (val);
    break;
  case "number":
    this.stringifyNumber (val);
    break;
  case "boolean":
    this.stringifyBoolean (val);
    break;
  case "symbol":
    const str = val.toString();
    this.stringifyString (str.substring ("Symbol(".length, str.length - 1));
  default:
    this.output += "undefined";
  }
}

/* ===--------------------------------------------------------------------------
// Generate the indentation for the specified depth */
stringifyIndent (depth) {
  this.output += ' '.repeat (depth * this.indent);
}

/* ===--------------------------------------------------------------------------
// Format the value */
stringify() {
  this.stringifyValue (this.value, true, 0);

  /* Prevent from calling again */
  delete this.value;
  return this.output;
}

/* ===--------------------------------------------------------------------------
// Initialize the formatter */
constructor (value, replacer=null, indent=0) {
  /* Check the indentation size */
  switch (indent) {
  case 8: break;
  case 4: break;
  case 2: break;
  case 0: break;
  default: throw new RangeError();
  }

  Object.defineProperties (this, {
    output: {value: "", writable: true},
    value: {value: value, writable: true, configurable: true},
    replacer: {value: replacer},
    indent: {value: indent}
  });
}}

/* =============================================================================
// Main interface
// -------------------------------------------------------------------------- */

const USON = new Object();

/* ===--------------------------------------------------------------------------
// ES6 class syntax doesn't allow static non-function properties */
Object.defineProperties (USON, {
  [Symbol.toStringTag]: {get: () => "USON"},

  /* ===----------------------------------------------
  // Replace obsolete whitespace control characters */
  normalizeWspace: {value: (input, indent=2) => {
    return input
    /* Replace with spaces */
    .replace (/\t/g, ' '.repeat (indent))
    /* Replace Windows and MacOS Classic line endings with line feeds */
    .replace (/\r\n?/g, '\n');
  }},

  /* ===------------------------------------------------------
  // Check if the character is a valid identifier character */
  isIdentifierChar: {value: (chr) => {
    /* Any character that is not part of USON grammar
    // is a valid identifier character */
    switch (chr) {
    case '{':
    case '}':
    case '[':
    case ']':
    case '<':
    case '>':
    case '(':
    case ')':
    case '#':
    case '"':
    case ':':
    case ';':
    case ',':
    case '\x7f': return false;
    default: return chr > ' ';
    }
  }},

  /* ===----------------------------------------------
  // Check if the string qualifies as an identifier */
  isIdentifier: {value: (str) => str.match (USON.pattern.identifier) === null},

  /* ===---------------------------------------------
  // Check if the string qualifies as a media type */
  isMediaType: {value: (str) => str.match (USON.pattern.media) === null},

  /* ===-------------------------------
  // Emulate `JSON.parse()` behavior */
  parse: {value: (input, reviver) => {
    const parser = new USONParser(input, reviver, false);
    const root = parser.parse();

    if (root === undefined) {
      throw new SyntaxError ('[' + USON.errorStr[parser.err] + ']'
      + ' ' + parser.line + ':' + parser.col);
    }

    return root;
  }},

  /* ===-----------------------------------
  // Emulate `JSON.stringify()` behavior */
  stringify: {value: (value, replacer, indent) => {
    return new USONFormatter(value, replacer, indent).stringify();
  }},

  /* Regular expression patterns can provide some speed up
  // as they might be optimized by JavaScript engines */
  pattern: {value: {
    /* Negative polarity on some of the patterns
    // is intentional: they are used to scan
    // until the next stop-character */
    number: /[^-+\d.e]/ig,
    unicode: /[^\da-f]/ig,
    string: /[\x00-\x1f\\"\x7f]/g,
    media: /[\x00-\x20{}\[\]<>":?,#()\x7f]/g,
    identifier: /[\x00-\x20{}\[\]<>":;,#()\x7f]/g,
    commentMulti: /[\x00-\x1f()\x7f]/g,
    commentSingle: /[\x00-\x1f\x7f]/g,
    wspace: /[^\x20]/g
  }},

  /* Decoding table */
  base64DecodeLut: {value: [
    /*  255: invalid input character,
    //  128: closing angle bracket,
    //   64: padding character,
    // 0-63: Base64 sextets */
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255,  62, 255, 255, 255,  63,
     52,  53,  54,  55,  56,  57,  58,  59,
     60,  61, 255, 255, 255,  64, 128, 255,
    255,   0,   1,   2,   3,   4,   5,   6,
      7,   8,   9,  10,  11,  12,  13,  14,
     15,  16,  17,  18,  19,  20,  21,  22,
     23,  24,  25, 255, 255, 255, 255, 255,
    255,  26,  27,  28,  29,  30,  31,  32,
     33,  34,  35,  36,  37,  38,  39,  40,
     41,  42,  43,  44,  45,  46,  47,  48,
     49,  50,  51, 255, 255, 255, 255, 255
  ]},

  /* Encoding table */
  base64EncodeLut: {value: [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
    'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
    'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
    'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
    'g', 'h', 'i', 'i', 'k', 'l', 'm', 'n',
    'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
    'w', 'x', 'y', 'z', '0', '1', '2', '3',
    '4', '5', '6', '7', '8', '9', '+', '/'
  ]},

  /* Padding character */
  base64EncodePad: {value: '='},

  /* Error constants */
  error: {value: {
    ok: 0,
    number: 1,
    string: 2,
    stringEscape: 3,
    escapeUnicode: 4,
    noMedia: 5,
    base64Encoding: 6,
    unexpectedToken: 7,
    unexpectedEnd: 8
  }},

  /* Error strings */
  errorStr: {value: [
    "OK",
    "Number",
    "String",
    "Escape",
    "Unicode",
    "Media",
    "Base64",
    "Token",
    "End"
  ]}
});

/* =============================================================================
// UCFG: USON configuration
// -------------------------------------------------------------------------- */

const UCFG = new Object();

Object.defineProperties (UCFG, {
  [Symbol.toStringTag]: {get: () => "UCFG"},

  /* There is no `UCFG.stringify()` method separate
  // from `USON.stringify()` since configs aren't
  // auto-generated but rather written
  // manually by hand */
  parse: {value: (input, reviver) => {
    const parser = new USONParser(input, reviver, true);
    const root = parser.parse();

    if (root === undefined) {
      throw new SyntaxError ('[' + USON.errorStr[parser.err] + ']'
      + ' ' + parser.line + ':' + parser.col);
    }

    return root;
  }}
});

/* ===--------------------------------------------------------------------------
// CommonJS exports */
if (typeof module !== 'undefined'
&&  typeof module.exports !== 'undefined') {
  module.exports = {
    USON, UCFG,
    USONParser,
    USONFormatter,
    USONObject,
    USONArray,
    USONVerbatim,
    USONData,
    USONIdentifier,
    binarySearch,
    Integer
  };
}

/* ===------------------------------- {U} --------------------------------=== */
