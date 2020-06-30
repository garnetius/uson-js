# USON

Universal Serialized Object Notation.

This repository has USON implemented in JavaScript.

## What's New

  * Unquoted strings (identifiers):

    ```uson
    {
      deposit: €1000.00
    }
    ```

  * Base64-encoded strings for more compact binary data exchange:

    ```uson
    {
      data: <?text/plain?VVNPTiByb2NrcyE=>
    }
    ```

  * Long verbatim strings that need no character escaping:

    ```uson
    {
      pattern: <!regex
    <\s*a[^>]*>(.*?)<\s*/\s*a>
    !regex>
    }
    ```

  * Object key/value pairs can be separated by semicolons:

    ```uson
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

  * Object and array items can be separated simply by whitespace:

    ```uson
    [
      "aardvark"
      "abandon"
      "ability"
      "access"
      "abroad"
    ]
    ```

  * Trailing separators:

    ```uson
    [
      ["abstract", "arrow", "knee",]
    ]
    ```

  * Backwards-compatible with JSON: a valid JSON document is
    a valid USON document as well.

Somewhat more detailed description of USON features is in [samples](https://github.com/garnetius/uson/tree/master/samples) gallery.

## Usage

The API is conveniently identical to JSON:

```js
USON.parse (text[, reviver]);
USON.stringify (value[, replacer[, space]]);
```
