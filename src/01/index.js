const path = require("path");
const { promises } = require("fs");
const parser = require("@babel/parser");
const { default: traverse } = require("@babel/traverse");
const { getScriptFilePath } = require("./pathUtils");

async function bundler(entry) {
  console.log("[entry] ", entry);

  const basePath = path.dirname(entry);
  const ast = parser.parse(await promises.readFile(entry, "utf8"));

  traverse(ast, {
    CallExpression({ node: { callee, arguments: args } }) {
      if (callee.type === "Identifier" && callee.name === "require") {
        const filePath = getScriptFilePath(basePath, args[0].value);
        console.log("[filePath] ", filePath);
      }
    },
  });
}

const entries = [
  path.join(__dirname, "../../tests/fixtures/cjs/simple/entry.js"),
  path.join(__dirname, "../../tests/fixtures/cjs/nested/entry.js"),
  path.join(__dirname, "../../tests/fixtures/cjs/filename/entry.js"),
  path.join(__dirname, "../../tests/fixtures/cjs/circularDependency/entry.js"),
  path.join(__dirname, "../../tests/fixtures/cjs/node-modules/entry.js"),
  path.join(__dirname, "../../tests/fixtures/common/notFoundModule/entry.js"),
];

(async () => {
  for (const entry of entries) {
    const entryPath = path.dirname(entry).split("/");
    const entryDirname = entryPath[entryPath.length - 1];
    console.log(`--- ${entryDirname} ---`);
    await bundler(entry);
    console.log("----------------------\n");
  }
})();
