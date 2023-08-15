/**
 * Attention: this file cannot be running directly by rollup
 * Api designed to use with gulp configuration for building scripts
 */
const { defineConfig } = require('rollup');
const { default: nodeResolve } = require('@rollup/plugin-node-resolve');
const { default: commonjs } = require('@rollup/plugin-commonjs');
const { default: typescript } = require('@rollup/plugin-typescript');
const { default: terser } = require('@rollup/plugin-terser');
const path = require('node:path');

module.exports = (globMatches) => {
  const input = Object.fromEntries(
    globMatches.map((file) => [
      path
        .relative('src', file)
        .replace(/\.ts$/i, '')
        .replace(/(\\|\/)index/i, ''),
      path.join('src/', path.relative('src', file))
    ])
  );

  return defineConfig({
    input,
    plugins: [
      nodeResolve({ browser: true }),
      commonjs({ sourceMap: false }),
      typescript(),
      terser()
    ]
  });
};
