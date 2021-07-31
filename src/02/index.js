"use strict";

const { promises } = require('fs');
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

const entries = [
  [
    join(__dirname, "../../tests/fixtures/cjs/simple/entry.js"),
    join(__dirname, "./output/simple.js")
  ],
  [
    join(__dirname, "../../tests/fixtures/cjs/nested/entry.js"),
    join(__dirname, "./output/nested.js")
  ],
  [
    join(__dirname, "../../tests/fixtures/cjs/filename/entry.js"),
    join(__dirname, "./output/filename.js")
  ],
  [
    join(__dirname, "../../tests/fixtures/cjs/circularDependency/entry.js"),
    join(__dirname, "./output/circularDependency.js")
  ],
  [
    join(__dirname, "../../tests/fixtures/cjs/node-modules/entry.js"),
    join(__dirname, "./output/node-modules.js")
  ],
  [
    join(__dirname, "../../tests/fixtures/common/notFoundModule/entry.js"),
    join(__dirname, "./output/notFoundModule.js")
  ],
];

(async () => {
  for (const [entry, outputPath] of entries) {
    const entryPath = dirname(entry).split("/");
    const entryDirname = entryPath[entryPath.length - 1];
    console.log(`--- ${entryDirname} ---`);
    await bundler({ entry, outputPath });
    console.log("----------------------\n");
  }
})();
