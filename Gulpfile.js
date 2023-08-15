const { parallel, src, dest, task, series } = require('gulp');
const rename = require('gulp-rename');
const sass = require('gulp-sass')(require('sass'));
const rimraf = require('gulp-rimraf');
const { glob } = require('glob');
const path = require('node:path');
const { writeFile } = require('node:fs/promises');
const { rollup } = require('rollup');

const configPaths = {
  css: 'src/styles/*.scss',
  js: {
    modules: 'src/modules/*/index.ts',
    bootstrap: 'src/bootstrap.ts'
  },
  manifest: 'bootstrap.json',
  dest: 'browser',
  /** src/modules output folder in the destination folder */
  modules: 'modules'
};

task('bootstrap:css', () => {
  return src(configPaths.css)
    .pipe(sass({ errLogToConsole: true, outputStyle: 'compressed' }))
    .pipe(
      rename((outPath) => {
        outPath.basename += '_style';
      })
    )
    .pipe(dest(`${configPaths.dest}/${configPaths.modules}`));
});

task('bootstrap:js', async () => {
  const configWithGlob = require('./rollup.config');

  const build = await rollup(
    configWithGlob(
      await glob([configPaths.js.bootstrap, configPaths.js.modules])
    )
  );

  await build.write({
    dir: configPaths.dest,
    format: 'es',
    sourcemap: false
  });
});

task('bootstrap:generate-manifest', async () => {
  const patterns = [configPaths.js.modules, configPaths.css];
  const isStyleFile = /\.scss$/i;

  const bootstrapJson = {
    baseUrl: `/${configPaths.modules}`,
    main: 'launchd',
    modules: {}
  };
  process.stdout.write('Using launchd as system init daemon\n');

  for (const modPath of await glob(patterns)) {
    let id = '',
      type = '',
      filename = '';

    if (isStyleFile.test(modPath)) {
      id = path.basename(modPath, '.scss') + '_style';
      type = 'text/css';
      filename = `${id}.css`;
    } else {
      id = path.basename(path.dirname(modPath));
      type = 'application/javascript';
      filename = `${id}.js`;
    }

    bootstrapJson.modules[id] = {
      type,
      filename
    };
  }

  await writeFile(
    `${configPaths.dest}/${configPaths.manifest}`,
    JSON.stringify(bootstrapJson),
    'utf8'
  );
});

task('bootstrap:clean', () => {
  return src([`${configPaths.dest}/**/*`, `!${configPaths.dest}/index.html`], {
    read: false
  }).pipe(rimraf());
});

task(
  'bootstrap',
  series(
    task('bootstrap:clean'),
    parallel(
      task('bootstrap:css'),
      task('bootstrap:js'),
      task('bootstrap:generate-manifest')
    )
  )
);
