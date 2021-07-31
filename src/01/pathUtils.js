"use strict";

const path = require("path");

function isNodeModule(filename) {
  return filename.startsWith(".");
}

function getFilename(filename) {
  // index.js === . or main field is undefined
  if (filename === "." || filename === undefined) {
    return "index.js";
  }

  // omit .js
  if (path.extname(filename) === "") {
    return `${filename}.js`;
  }

  return filename;
}

function getScriptFilePath(basePath, filename) {
  if (isNodeModule(filename)) {
    return path.join(basePath, getFilename(filename));
  }

  // node_modules
  const moduleBasePath = path.join(basePath, "node_modules", filename);

  // e.g. require('a/b')
  // need to split by /
  if (filename.includes("/")) {
    const dir = path.dirname(moduleBasePath);
    const name = path.basename(moduleBasePath);

    return path.join(dir, getFilename(name));
  }

  // TODO: add module, browser, exports
  const { main } = require(path.join(moduleBasePath, "package.json"));

  // when main field is undefined, index.js will be an entry point
  return path.join(moduleBasePath, getFilename(main));
}

module.exports = {
  isNodeModule,
  getScriptFilePath,
};
