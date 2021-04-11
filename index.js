/* ================================= $ J $ =====================================
// USON Node.js demonstration program.
// -------------------------------------------------------------------------- */

"use strict"

import {Core} from "../core-js/core.mjs";

Core.infect();

import fs from "fs";

import {
  USON,
  USONParser
} from "./uson.mjs";

/* ===--------------------------------------------------------------------------
// Check the command line arguments */
if (process.argv.length < 3) {
  console.log (`
Usage: ${process.argv[0]} ${process.argv[1]} <document> [min]
`);

  process.exit (1);
}

/* Load the USON document */
const path = process.argv[2];
const min = process.argv[3] === "min";

if (!fs.existsSync (path)) {
  console.log (`Not found: ${path}`);
  process.exit (1);
}

const doc = fs.readFileSync (path, "utf8");

/* Use the parser object directly instead of `USON.parse()`
// so that we can have access to the parser's position
// and its error code if something goes wrong */
const parser = new USONParser (doc/*, (key, val) => {
  console.log (key);
  return val;
}*/);

/* Parse the USON document */
parser.allowComments();
parser.allowUnknownPrimitives();
const root = parser.parse();

/* Output the error code and the position in the input */
console.log ("Status:",   parser.err);
console.log ("Line:",     parser.line);
console.log ("Column:",   parser.col);
console.log ("Position:", parser.pos);

/* Format as JSON */
console.log();
console.log ("JSON:", JSON.stringify (root, null, min ? 0 : 2));

/* Format as USON */
console.log();
console.log ("USON:", USON.stringify (root, null, min ? 0 : 2));

/* ===------------------------------- {U} --------------------------------=== */
