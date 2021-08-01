"use strict";

const { promises, readFileSync, existsSync } = require("fs");
const { dirname, basename, join } = require("path");
const { default: traverse } = require("@babel/traverse");
const { default: generate } = require("@babel/generator");
const { transformToCjs } = require("./transformToCjs.js");
const { mainTemplate, moduleTemplate } = require("./template.js");
const { parse } = require("./utils/parser.js");
const { getScriptFilePath } = require("../01/pathUtils.js");
const { getModuleId, resolveModulePath } = require("./utils/module.js");

async function buildModulesMap(entryDir, entryFilename) {
  const modulesMap = new Set();
  const entryPath = getScriptFilePath(entryDir, `./${entryFilename}`);
  const entryCodeAst = parse(await promises.readFile(entryPath, "utf8"));
  let isESM = false;

  // add an entry point
  modulesMap.add({
    id: 0,
    path: entryPath, // an absolute path
    ast: entryCodeAst,
  });

  // start from the entry-point to check all deps
  walkDeps(entryCodeAst, entryDir, entryPath);

  function walkDeps(ast, _currentDir, beforePath) {
    traverse(ast, {
      // import
      ImportDeclaration({ node: { source } }) {
        isESM = true;

        const { nextRoot, filePath } = resolveModulePath(
          source.value,
          entryDir,
          beforePath
        );
        const hasAlreadyModule = Array.from(modulesMap).some(
          ({ path }) => path === filePath
        );

        if (!hasAlreadyModule) {
          try {
            const ast = parse(readFileSync(filePath, "utf-8"));

            modulesMap.add({
              id: modulesMap.size,
              ast,
              path: filePath,
            });

            walkDeps(ast, nextRoot, filePath);
          } catch (e) {
            console.warn("could not find the module:", e.message);
          }
        }
      },

      // require
      CallExpression({ node: { callee, arguments: args } }) {
        if (callee.type === "Identifier" && callee.name === "require") {
          const { nextRoot, filePath } = resolveModulePath(
            args[0].value,
            entryDir,
            beforePath
          );
          const hasAlreadyModule = Array.from(modulesMap).some(
            ({ path }) => path === filePath
          );

          if (!hasAlreadyModule) {
            try {
              const ast = parse(readFileSync(filePath, "utf-8"));

              modulesMap.add({
                id: modulesMap.size,
                ast,
                path: filePath,
              });

              walkDeps(ast, nextRoot, filePath);
            } catch (e) {
              console.warn("could not find the module:", e.message);
            }
          }
        }
      },
    });
  }

  return { modulesMap, isESM };
}

// replace a module path with a moduleId
function convertToModuleId(basePath, modulesMap) {
  const modules = new Map();

  for (const { id, ast, path } of modulesMap.values()) {
    traverse(ast, {
      CallExpression({ node: { callee, arguments: args } }) {
        if (callee.type === "Identifier" && callee.name === "require") {
          const moduleId = getModuleId(
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
  const { modulesMap, isESM } = await buildModulesMap(entryDir, entryFilename);

  if (isESM) {
    transformToCjs(entryDir, modulesMap);
  }

  const modules = convertToModuleId(entryDir, modulesMap);

  // export bundled code
  const bundled = mainTemplate(modules, 0, isESM);
  // console.log(bundled);
  await promises.writeFile(outputPath, bundled, "utf-8");
}

(async () => {
  const outputDirPath = join(__dirname, "../../output/03");
  const isOutputDirExists = existsSync(outputDirPath);
  if (!isOutputDirExists) promises.mkdir(outputDirPath, { recursive: true });

  const entries = [
    [
      join(__dirname, "../../tests/fixtures/cjs/simple/entry.js"),
      join(__dirname, "../../output/03/cjs-simple.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/nested/entry.js"),
      join(__dirname, "../../output/03/cjs-nested.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/filename/entry.js"),
      join(__dirname, "../../output/03/cjs-filename.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/circularDependency/entry.js"),
      join(__dirname, "../../output/03/cjs-circularDependency.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/node-modules/entry.js"),
      join(__dirname, "../../output/03/cjs-node-modules.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/simple/entry.js"),
      join(__dirname, "../../output/03/esm-simple.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/import/entry.js"),
      join(__dirname, "../../output/03/esm-import.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/default/entry.js"),
      join(__dirname, "../../output/03/esm-default.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/complication/entry.js"),
      join(__dirname, "../../output/03/esm-complication.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/specifier/entry.js"),
      join(__dirname, "../../output/03/esm-specifier.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/namespaceSpecifier/entry.js"),
      join(__dirname, "../../output/03/esm-namespaceSpecifier.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/node-modules/entry.js"),
      join(__dirname, "../../output/03/esm-node-modules.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/common/notFoundModule/entry.js"),
      join(__dirname, "../../output/03/common-notFoundModule.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/common/interop/entry.js"),
      join(__dirname, "../../output/03/common-interop.js"),
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
