"use strict";

const { promises, readFileSync, existsSync } = require("fs");
const { dirname, basename, join } = require("path");
const { default: traverse } = require("@babel/traverse");
const { default: generate } = require("@babel/generator");
const { transformAst } = require("./transformAst");
const { mainTemplate, moduleTemplate } = require("./template");
const { parse } = require("../03/utils/parser");
const { getScriptFilePath } = require("../01/pathUtils");
const { getModule, resolveModulePath } = require("./utils/module");

async function buildModulesMap(entryDir, entryFilename) {
  const modulesMap = new Set();
  const entryPath = getScriptFilePath(entryDir, entryFilename);
  const visitedFiles = [];

  // start from the entry-point to check all deps
  walkDeps(entryDir, entryPath, entryFilename);

  function walkDeps(_currentDir, beforePath, src) {
    const { nextRoot, filePath } = resolveModulePath(src, entryDir, beforePath);

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
          walkDeps(nextRoot, filePath, source.value);
        },

        // require
        CallExpression({ node: { callee, arguments: args } }) {
          if (callee.type === "Identifier" && callee.name === "require") {
            type = "cjs";
            walkDeps(nextRoot, filePath, args[0].value);
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
        id: modulesMap.size, // the entry point's id is 0
        ast,
        path: filePath, // an absolute path
        type, // in fact, CJS as default is better
      });
    } catch (e) {
      console.warn("could not find the module:", filePath);
    }
  }

  return modulesMap;
}

// replace a module path with a moduleId
function convertToModuleId(basePath, modulesMap) {
  const modules = new Map();

  for (const { id, ast, path } of modulesMap.values()) {
    traverse(ast, {
      CallExpression({ node: { callee, arguments: args } }) {
        if (callee.type === "Identifier" && callee.name === "require") {
          const { id: moduleId } = getModule(
            modulesMap,
            path,
            args[0].value,
            basePath
          );

          args[0].value = moduleId;
        }
      },
    });

    modules.set(id, {
      path,
      code: moduleTemplate(generate(ast).code),
    });
  }

  return modules;
}

async function bundler({ entry, outputPath }) {
  const entryFilename = basename(entry);
  const entryDir = dirname(entry);
  const modulesMap = await buildModulesMap(entryDir, `./${entryFilename}`);
  const hasEsmModules = Array.from(modulesMap.values()).some(
    ({ type }) => type === "esm"
  );
  const { id: entryPointId } = Array.from(modulesMap).find(
    ({ path }) => path === entry
  );

  transformAst(entryDir, modulesMap);

  const modules = convertToModuleId(entryDir, modulesMap);

  // export bundled code
  const bundled = mainTemplate(modules, entryPointId, hasEsmModules);
  // console.log(bundled);
  await promises.writeFile(outputPath, bundled, "utf-8");
}

(async () => {
  const outputDirPath = join(__dirname, "../../output/04");
  const isOutputDirExists = existsSync(outputDirPath);
  if (!isOutputDirExists) promises.mkdir(outputDirPath, { recursive: true });

  const entries = [
    [
      join(__dirname, "../../tests/fixtures/cjs/simple/entry.js"),
      join(__dirname, "../../output/04/cjs-simple.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/nested/entry.js"),
      join(__dirname, "../../output/04/cjs-nested.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/filename/entry.js"),
      join(__dirname, "../../output/04/cjs-filename.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/circularDependency/entry.js"),
      join(__dirname, "../../output/04/cjs-circularDependency.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/node-modules/entry.js"),
      join(__dirname, "../../output/04/cjs-node-modules.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/simple/entry.js"),
      join(__dirname, "../../output/04/esm-simple.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/import/entry.js"),
      join(__dirname, "../../output/04/esm-import.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/default/entry.js"),
      join(__dirname, "../../output/04/esm-default.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/complication/entry.js"),
      join(__dirname, "../../output/04/esm-complication.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/specifier/entry.js"),
      join(__dirname, "../../output/04/esm-specifier.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/namespaceSpecifier/entry.js"),
      join(__dirname, "../../output/04/esm-namespaceSpecifier.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/node-modules/entry.js"),
      join(__dirname, "../../output/04/esm-node-modules.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/common/notFoundModule/entry.js"),
      join(__dirname, "../../output/04/common-notFoundModule.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/common/interop/entry.js"),
      join(__dirname, "../../output/04/common-interop.js"),
    ],
  ];

  for (const [entry, outputPath] of entries) {
    const entryPath = dirname(entry).split("/");
    const entryDirname = entryPath[entryPath.length - 1];
    console.log(`--- ${entryDirname} ---`);
    await bundler({ entry, outputPath });
    console.log("----------------------\n");
  }
})();
