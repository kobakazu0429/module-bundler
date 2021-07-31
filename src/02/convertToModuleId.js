const { dirname } = require("path");
const { default: traverse } = require("@babel/traverse");
const { default: generate } = require("@babel/generator");
const { moduleTemplate } = require("./template");
const { getScriptFilePath, isNodeModule } = require("../01/pathUtils");

// replace a module path with a moduleId
function convertToModuleId(basePath, modulesMap) {
  const modules = new Map();

  for (const { id, ast, path } of modulesMap.values()) {
    traverse(ast, {
      CallExpression({ node: { callee, arguments: args } }) {
        if (callee.type === "Identifier" && callee.name === "require") {
          const filePath = getScriptFilePath(
            // don't reset the path when node_modules
            // because the path during searching in node_modules is the base path of modulesMap
            isNodeModule(args[0].value) ? dirname(path) : basePath,
            args[0].value
          );
          const { id: moduleId } =
            Array.from(modulesMap.values()).find(
              ({ path }) => path === filePath
            ) || {};

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

module.exports = { convertToModuleId };
