"use strict";

const { dirname } = require("path");
const { getScriptFilePath, isNodeModule } = require("../../01/pathUtils");
const { resolveModulePath } = require("../../03/utils/module");

function getModule(modulesMap, currentModulePath, moduleName, basePath) {
  const filePath = getScriptFilePath(
    !isNodeModule(moduleName) ? dirname(currentModulePath) : basePath,
    moduleName
  );

  return (
    Array.from(modulesMap.values()).find(({ path }) => path === filePath) || {}
  );
}

module.exports = {
  isNodeModule,
  getModule,
  resolveModulePath,
};
