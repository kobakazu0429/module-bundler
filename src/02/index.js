"use strict";

const { existsSync, promises } = require("fs");
const { dirname, basename, join } = require("path");
const { mainTemplate } = require("./template");
const { buildModulesMap } = require("./buildModulesMap");
const { convertToModuleId } = require("./convertToModuleId");

async function bundler({ entry, outputPath }) {
  const entryFilename = basename(entry);
  const entryDir = dirname(entry);
  const modulesMap = await buildModulesMap(entryDir, entryFilename);
  // console.log(modulesMap);
  const modules = convertToModuleId(entryDir, modulesMap);

  // export bundled code
  const bundled = mainTemplate(modules, 0);
  // console.log(bundled);
  await promises.writeFile(outputPath, bundled, "utf-8");
}

(async () => {
  const outputDirPath = join(__dirname, "../../output/02");
  const isOutputDirExists = existsSync(outputDirPath);
  if (!isOutputDirExists) promises.mkdir(outputDirPath, { recursive: true });

  const entries = [
    [
      join(__dirname, "../../tests/fixtures/cjs/simple/entry.js"),
      join(__dirname, "../../output/02/simple.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/nested/entry.js"),
      join(__dirname, "../../output/02/nested.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/filename/entry.js"),
      join(__dirname, "../../output/02/filename.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/circularDependency/entry.js"),
      join(__dirname, "../../output/02/circularDependency.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/node-modules/entry.js"),
      join(__dirname, "../../output/02/node-modules.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/common/notFoundModule/entry.js"),
      join(__dirname, "../../output/02/notFoundModule.js"),
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
