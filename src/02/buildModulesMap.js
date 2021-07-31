const { promises, readFileSync } = require("fs");
const { dirname } = require("path");
const parser = require("@babel/parser");
const { default: traverse } = require("@babel/traverse");
const { getScriptFilePath, isNodeModule } = require("../01/pathUtils");

async function buildModulesMap(entryDir, entryFilename) {
  const modulesMap = new Set();
  const entryPath = getScriptFilePath(entryDir, `./${entryFilename}`);
  const entryCodeAst = parser.parse(await promises.readFile(entryPath, "utf8"));

  // add an entry point
  modulesMap.add({
    id: 0,
    path: entryPath, // an absolute path
    ast: entryCodeAst,
  });

  // start from the entry-point to check all deps
  walkDeps(entryCodeAst, entryDir);

  function walkDeps(ast, currentDir) {
    traverse(ast, {
      CallExpression({ node: { callee, arguments: args } }) {
        if (callee.type === "Identifier" && callee.name === "require") {
          const filePath = getScriptFilePath(currentDir, args[0].value);
          const hasAlreadyModule = Array.from(modulesMap).some(
            ({ path }) => path === filePath
          );

          if (!hasAlreadyModule) {
            try {
              // reset the current directory when node_modules
              // ./ has 2 types which are local of the first party and local of the third party module
              const nextDir = isNodeModule(args[0].value)
                ? entryDir
                : dirname(filePath);
              const ast = parser.parse(readFileSync(filePath, "utf-8"));

              modulesMap.add({
                id: modulesMap.size, // unique id, because modulesMap.size will be incremented when add()
                ast,
                path: filePath,
              });

              walkDeps(ast, nextDir);
            } catch (e) {
              console.warn("could not find the module:", e.message);
            }
          }
        }
      },
    });
  }

  return modulesMap;
}

module.exports = { buildModulesMap };
