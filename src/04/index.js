"use strict";

const { promises, existsSync } = require("fs");
const { dirname, basename, join } = require("path");
const { transformAst } = require("./transformAst");
const { mainTemplate } = require("./template");
const { buildModulesMap } = require("./buildModulesMap");
const { convertToModuleId } = require("./convertToModuleId");

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
