USON JS
=======

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**USON**: micro serialized object notation, a modern improvement over [JSON](https://www.json.org/json-en.html).

Ever since widespread JSON adoption, various proposals were put forward to address its apparent shortcomings. They took various forms and ranged from completely new formats, describing additional new data types, to minor adjustments over the core JSON syntax.

USON doesn’t actively seek to replace JSON (it’s backwards-compatible with it anyway). Rather, it is a focused effort on finding best solutions to problems for which JSON doesn’t really seem to have a good answer.

In particular, JSON claims that it is easy for both humans and machines to read and write. Although the former is mostly true, the latter is very much debatable:

  * Writing complex strings spanning several lines by hand is practically impossible in JSON. JSON is not really human-writable, unless the contents of the document are fairly simple. USON “verbatim” strings doesn’t need to be escaped and solve the problem once and for all.

  * JSON doesn’t have built-in means to store binary data. Storing binary data in regular strings is ugly and inefficient. A popular approach is to encode data in `Base64` before putting it inside string, but it can be feasible only for small chunks of data. USON offers clear way to store binary using special `Base64`-encoded strings tagged with media type. This allows streaming parsers to decode them on-the-fly, without having to wait for complete JSON string to arrive. An optional media type tag reduces security concerns.

  * Using custom number formats, such as hexadecimal, can be a real pain in JSON. USON unquoted strings elegantly allow for such formats to be implemented with ease, without coercing numbers into strings. *(Custom values are off by default and have to be explicitly enabled.)*

  * Single line and nested multiline comments are supported. *(Comments are off by default and have to be explicitly enabled.)*

  * Unquoted key names are allowed to improve manual authoring.

Although there are many ways things like binary or multiline strings can be represented in a structured plain text format, USON makes a noticeable effort in keeping its additions simple, syntactically meaningful, and, most importantly, performant. New features are introduced in its syntax in a way that prevents reduction in speed. Only one new token `<` is used to represent new USON string types, and a hypothetical, properly coded, USON parser would process regular JSON at the same speed as its would-be JSON-only counterpart.

## At a glance

  * Object key / value pairs can be separated by semicolons. There can be a trailing semicolon after the last statement, before the end of an object:

    ```js
    {
      name: "server";

      locations: {
        # Default location
        "/": {
          enabled: true;
          root: "/opt/www";
          cache: on (inline comment);
        }
      }
    }
    ```

  * Stemming from above, trailing comma in arrays is now officially allowed, too:

    ```js
    [
      "abstract",
      "arrow",
      "knee",
    ]
    ```

  * Unquoted strings (commonly referred to as “identifiers”) in both keys and values:

    ```js
    {
      address: 0x7cef0800;
    }
    ```

  * Often-requested number type improvements: allow explicit plus sign, leading and trailing decimal points without zero, infinities and not-a-number.

    ```js
    [Inf, +Inf, -Inf, NaN, +.5, 3.]
    ```

  * Real Unicode escape sequences in strings without surrogate pairs:

    ```js
    "USON on GitHub! \u{1F602}"
    ```

  * Native Base64-encoded strings for faster and more compact binary data exchange:

    ```js
    {
      data: <?text/plain?VVNPTiByb2NrcyE=>
    }
    ```

  * Literal (verbatim) multiline strings allow complex content to be written effortlessly, and no character escaping is needed:

    ```js
    {
      pattern: <!regex
    <\s*a[^>]*>(.*?)<\s*/\s*a>
    !regex>;

      article: <!markdown
    **General relativity**, also known as the general theory of relativity,
    is the [geometric theory](https://en.wikipedia.org/wiki/Scientific_theory)
    of gravitation published by Albert Einstein in 1915 and is the current
    description of gravitation in modern physics.

    General relativity generalizes *special relativity* and refines
    *Newton’s law of universal gravitation*, providing a unified description
    of gravity as a geometric property of space and time or four-dimensional
    spacetime. In particular, the curvature of spacetime is directly related
    to the energy and momentum of whatever matter and radiation are present.
    The relation is specified by the Einstein field equations, a system
    of partial differential equations.

    Content from [Wikipedia](https://en.wikipedia.org).
    !markdown>;
    }
    ```

    In this particular example `regex` and `markdown` are two delimiting identifiers serving to mark the beginning and the ending of string contents. The choice of their names is purely to enhance readability and presentation. They could be anything else, like `stuff`, or `science`, or just be empty.

    A hypothetical text editor with USON support might use delimiting identifiers as hints to provide custom syntax highlighting for contents of verbatim strings.

  * XML markup tag values:

    ```js
    {
      widget: <input type="textbox" enabled="yes">
        <!-- Default value for the outgoing message -->
        <value><![CDATA[Message here.]]></value>
      </input>
    }
    ```

  * Comments:

    ```js
    {
      (* Nested multiline
      skipped: (and inline) "value";*)
      not-skipped: "value"; # Single line
    }
    ```

USON maintains backwards-compatibility with JSON: a valid JSON document is a valid USON document as well.

Somewhat more detailed description of USON features is in the provided [samples](https://github.com/garnetius/uson-js/tree/master/gallery) gallery.

### Compared to Other Solutions

It is important to note that USON is *not* a subset of any language (like JSON, for example) nor does it strive to be, although USON syntax mimics established practices and does it on-purpose to be easily recognizable and comprehensible.

For this reason USON decided against some things it considers redundant, like support for single-quoted strings (but available in **UCFG**, see below) or mandatory support for hexadecimal numbers.

Hexadecimal (octal, binary, whatever) numbers can be used in USON via unquoted string values by explicitly allowing unrecognized primitives for parser instance. When enabled, any unquoted USON string that failed to parse as a decimal number, infinity, `NaN`, boolean, or `null` is simply handed over to application, which decides what to do with it.

This way arbitrary number formats and `enum`s can be made possible in USON without overloading the grammar.

## Usage

The API is conveniently identical to JSON:

```js
USON.parse (text[, reviver]);
USON.stringify (value[, replacer[, space]]);
```

USON works in modern browsers out of the box.

### Multiline strings? Binary data? XML?!

Most of time regular double-quoted JSON strings work just fine for the purpose of content transfer. It’s quite unusual to have a JSON document consisting exclusively of multiline strings, or numerous binary payloads. Usually USON features aren’t needed that much.

But things can change dramatically when USON is authored by hand, includes string content in various formats, and needs to be formatted for easy visual presentation.

So when you *do* need features like that, USON offers a ready & clean solution.

The same is true for XML markup. USON uses a tiny fraction of XML standard via [UXML](https://github.com/garnetius/uxml-js) to parse XML, and when you do happen to need your markup included in a cleanest way possible, there aren’t many alternatives to do it better than USON.

## XML over USON

It is possible to parse many regular **XML** documents with USON, eliminating the need for calling a separate parser.

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

## USON as a configuration format

Some USON features might look appealing enough to use it as a configuration file format. And for very complex configurations it may indeed be a preferred option.

However, it’s strongly advised against using USON (or JSON) for configs. [UCFG](https://github.com/garnetius/ucfg-js) is a much better option and the linked page mentions some of the reasons why.

## Caveats

Carriage return `CR` in line endings (Windows-style) is not supported by USON grammar. USON verbatim strings feature requires normalization of line endings in entire document and settling on line feeds `LF` is an obvious choice.

*JSON* documents with `CR`s in them will be accepted just fine, as per backwards-compatibility requirement, but a document using new USON features would very likely trigger a parsing error when `CR`s are encountered.

This means that verbatim strings also cannot have any `CR`s in them. Therefore a properly configured text editor with support for UNIX-style line endings is needed when USON is written by hand. Even when USON is generated automatically and minified, care should be taken to ensure that verbatim strings use only line feeds for formatting.

Simply eliminate Windows line endings from your workflow.

## Try it Out!

With [Node.js](https://nodejs.org/en/):

```bash
git clone https://github.com/garnetius/core-js.git
git clone https://github.com/garnetius/radix-tree-js.git
git clone https://github.com/garnetius/uxml-js.git
git clone https://github.com/garnetius/uson-js.git

cd uson-js
node index.js gallery/object.uson
```
