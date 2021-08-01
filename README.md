# module-bundler

ref: https://github.com/hiroppy/the-sample-of-module-bundler

and some files(Makefile, tests/) are copied from it.

## Directory Structure

|dir|description|support|
|:-|:-|:-:|
|src/01|entry ファイルから require されているファイルを全て列挙|CommonJS only|
|src/02|01 のコードを使いつつ1つのファイルに bundle|CommonJS only|
|src/03|01,02 のコードを使いつつ CommonJS, ES Modules ファイルを 1 つのファイルに bundle|CommonJS, ES Modules|
|src/04|CommonJS とES Modules のinteropを実装|CommonJS and ES Modules|
|src/05|terserでminify|CommonJS and ES Modules|

## Development

```bash
git clone git@github.com:kobakazu0429/module-bundler.git
yarn install
make install # for installing package at tests/fixtures/{cjs|esm}/node-modules
```
