"use strict";
const { readFileSync } = require("fs");
const { default: traverse } = require("@babel/traverse");
const { parse } = require("../03/utils/parser");
const { getScriptFilePath } = require("../01/pathUtils");
const { resolveModulePath } = require("./utils/module");

async function buildModulesMap(entryDir, entryFilename) {
  const modulesMap = new Set();
  const entryPath = getScriptFilePath(entryDir, entryFilename);
  const visitedFiles = [];

  // start from the entry-point to check all deps
  walkDeps(entryPath, entryFilename);

  function walkDeps(prevPath, src) {
    const filePath = resolveModulePath(src, entryDir, prevPath);

    if (visitedFiles.includes(filePath)) {
      return;
    }

    visitedFiles.push(filePath);

    try {
      const ast = parse(readFileSync(filePath, "utf-8"));
      let type = "esm";

      traverse(ast, {
        // import
        ImportDeclaration({ node: { type, source } }) {
          type = "esm";
          walkDeps(filePath, source.value);
        },

        // require
        CallExpression({ node: { callee, arguments: args } }) {
          if (callee.type === "Identifier" && callee.name === "require") {
            type = "cjs";
            walkDeps(filePath, args[0].value);
          }
        },

        // check ESM or CJS
        // exports or module.exports or ESM export
        ExpressionStatement({ node: { expression } }) {
          if (expression.operator === "=") {
            type = "cjs";
          }
        },
      });

      modulesMap.add({
        id: modulesMap.size,
        ast,
        path: filePath,
        type, // in fact, CJS as default is better
      });
    } catch (e) {
      console.warn("could not find the module:", filePath);
    }
  }

  return modulesMap;
}

module.exports = { buildModulesMap };
