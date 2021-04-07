# USON JS

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

USON (Universal Serialized Object Notation): a modern improvement over JSON.

This repository has USON implemented in JavaScript.

## Features

  * Object key/value pairs can be separated by semicolons:

    ```js
    {
      name: "server";
      locations: {
        "/" {
          enabled: true;
          root: "/opt/www";
          cache: on (inline comment);
        }
      }
    }
    ```

  * Stemming from above, trailing comma is now officially allowed, too:

    ```js
    [
      "abstract",
      "arrow",
      "knee",
    ]
    ```

  * Unquoted strings (identifiers) in both keys and values:

    ```js
    {
      key: value
    }
    ```

  * Number type additions (leading or trailing zero is no longer required):

    ```js
    [Inf, -Inf, NaN, .5, 3.]
    ```

  * Real Unicode escape sequences:

    ```js
    "\u{1F602}"
    ```

  * Native Base64-encoded strings for faster and more compact binary data exchange:

    ```js
    {
      data: <?text/plain?VVNPTiByb2NrcyE=>
    }
    ```

  * Long verbatim strings (no character escaping needed):

    ```js
    {
      pattern: <!regex
    <\s*a[^>]*>(.*?)<\s*/\s*a>
    !regex>
    }
    ```

  * XML tags as values:

    ```js
    {
      key: <tag option="yes">
        <!-- XML inside USON -->
        <data><![CDATA[Value]]></data>
      </tag>
    }
    ```

  * Comments:

    ```js
    {
      # Single line.
      (* Nested multiline
      skipped: (and inline) value; *)
      not-skipped: value;
    }
    ```

Backwards-compatible with JSON: a valid JSON document is a valid USON document as well.

Somewhat more detailed description of USON features is in the [samples](https://github.com/garnetius/uson-js/tree/master/gallery) gallery.

## Usage

The API is conveniently identical to JSON:

```js
USON.parse (text[, reviver]);
USON.stringify (value[, replacer[, space]]);
```

USON works in modern browsers out of the box.

## XML over USON

It is possible to parse XML with USON, eliminating the need for separate parser.

Much like JSON, USON supports single root values, e.g.:

```js
"This document consists of a single string only."
```

Or:

```js
3.14
```

Will be parsed as a string and a number respectively.

When parsing XML document with USON, the [entire document](https://github.com/garnetius/uson-js/tree/master/gallery/xml.xml), including all top-level processing instructions, is treated as a single root USON value.

Of course, outputting such a document back with USON as a proper XML is supported as well.

Note that this won’t work when entire XML *document* is used as a *non-root* USON value:

```js
{
  value: <?xml version="1.0"?> <!-- Error -->
  <root>
    <tag/>
  </root>
}
```

Only XML *tags* can be non-root USON values:

```js
{
  value: <root> <!-- 👍 OK -->
    <tag/>
  </root>
}
```

## Caveats

Carriage returns `CR` in line endings (Windows-style) is not supported by USON grammar. USON verbatim strings feature requires normalization of line endings in entire document and settling on line feeds `LF` is an obvious choice.

*JSON* documents with `CR`s in them will be accepted just fine, as per backwards-compatibility requirement, but a document using new USON features would very likely trigger a parsing error when `CR`s are encountered.

This means that verbatim strings also cannot have any `CR`s in them. Therefore a properly configured text editor with support for UNIX-style line endings is needed when USON is written by hand. Even when USON is generated automatically and minified, care should be taken to ensure that verbatim strings use only line feeds for formatting.

Simply eliminate Windows line endings from your workflow.

## Try it Out!

With Node.js:

```bash
git clone https://github.com/garnetius/core-js.git
git clone https://github.com/garnetius/radix-tree-js.git
git clone https://github.com/garnetius/uxml-js.git
git clone https://github.com/garnetius/uson-js.git

cd uson-js
node index.js gallery/object.uson
```
