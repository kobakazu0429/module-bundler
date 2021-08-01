"use strict";

const { promises, existsSync } = require("fs");
const { dirname, basename, join } = require("path");
const Terser = require("terser");
const { transformAst } = require("../04/transformAst");
const { mainTemplate } = require("../04/template");
const { buildModulesMap } = require("../04/buildModulesMap");
const { convertToModuleId } = require("../04/convertToModuleId");

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

  const bundled = mainTemplate(modules, entryPointId, hasEsmModules);
  // console.log(bundled);

  const { code: minifiedCode, error: terserError } = await Terser.minify(
    bundled
  );
  if (terserError) {
    console.error(terserError);
  } else {
    // export bundled code
    await promises.writeFile(outputPath, bundled, "utf-8");
    const minifiedFilename = `${basename(outputPath).split(".js")[0]}.min.js`;
    const minifiedFilePath = join(dirname(outputPath), minifiedFilename);
    await promises.writeFile(minifiedFilePath, minifiedCode, "utf-8");
  }
}

(async () => {
  const outputDirPath = join(__dirname, "../../output/05");
  const isOutputDirExists = existsSync(outputDirPath);
  if (!isOutputDirExists) promises.mkdir(outputDirPath, { recursive: true });

  const entries = [
    [
      join(__dirname, "../../tests/fixtures/cjs/simple/entry.js"),
      join(__dirname, "../../output/05/cjs-simple.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/nested/entry.js"),
      join(__dirname, "../../output/05/cjs-nested.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/filename/entry.js"),
      join(__dirname, "../../output/05/cjs-filename.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/circularDependency/entry.js"),
      join(__dirname, "../../output/05/cjs-circularDependency.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/cjs/node-modules/entry.js"),
      join(__dirname, "../../output/05/cjs-node-modules.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/simple/entry.js"),
      join(__dirname, "../../output/05/esm-simple.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/import/entry.js"),
      join(__dirname, "../../output/05/esm-import.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/default/entry.js"),
      join(__dirname, "../../output/05/esm-default.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/complication/entry.js"),
      join(__dirname, "../../output/05/esm-complication.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/specifier/entry.js"),
      join(__dirname, "../../output/05/esm-specifier.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/namespaceSpecifier/entry.js"),
      join(__dirname, "../../output/05/esm-namespaceSpecifier.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/esm/node-modules/entry.js"),
      join(__dirname, "../../output/05/esm-node-modules.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/common/notFoundModule/entry.js"),
      join(__dirname, "../../output/05/common-notFoundModule.js"),
    ],
    [
      join(__dirname, "../../tests/fixtures/common/interop/entry.js"),
      join(__dirname, "../../output/05/common-interop.js"),
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
