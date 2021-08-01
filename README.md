# module-bundler

ref: https://github.com/hiroppy/the-sample-of-module-bundler

and some files(Makefile, tests/) are copied from it.

## Directory Structure

|dir|description|support|
|:-|:-|:-:|
|src/01/|entryファイルからrequireされているファイルを全て列挙|cjs only|
|src/02/|01のコードを使いつつ1つのファイルにbundle|cjs only|
|src/03/|01,02のコードを使いつつcjs,esmファイルを1つのファイルにbundle(bugあり)|cjs, esm|

## Development

```bash
git clone git@github.com:kobakazu0429/module-bundler.git
yarn install
make install # for installing package at tests/fixtures/{cjs|esm}/node-modules
```
