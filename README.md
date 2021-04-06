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
