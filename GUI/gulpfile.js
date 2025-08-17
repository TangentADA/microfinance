// Migrated to Gulp 4 (Bower-free)
const { src, dest, series, parallel, watch } = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const browserSync = require('browser-sync').create();
const del = require('del');

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

let dev = true;

// Styles
function styles() {
  return src('app/styles/*.css')
    .pipe($.if(dev, $.sourcemaps.init()))
    .pipe($.autoprefixer())
    .pipe($.if(dev, $.sourcemaps.write()))
    .pipe(dest('.tmp/styles'))
    .pipe(reload({ stream: true }));
}

// Scripts
function scripts() {
  return src('app/scripts/**/*.js')
    .pipe($.plumber())
    .pipe($.if(dev, $.sourcemaps.init()))
    .pipe($.babel())
    .pipe($.if(dev, $.sourcemaps.write('.')))
    .pipe(dest('.tmp/scripts'))
    .pipe(reload({ stream: true }));
}

// Lint
function lint(files) {
  return src(files)
    .pipe($.eslint({ fix: true }))
    .pipe(reload({ stream: true, once: true }))
    .pipe($.eslint.format())
    .pipe($.eslint.failAfterError());
}

function lintApp() {
  return lint('app/scripts/**/*.js').pipe(dest('app/scripts'));
}

function lintTest() {
  return lint('test/spec/**/*.js').pipe(dest('test/spec'));
}

// HTML
function html() {
  return src('app/*.html')
    .pipe($.useref({ searchPath: ['.tmp', 'app', '.'] }))
    .pipe($.if(/\.js$/, $.uglify({ compress: { drop_console: true } })))
    .pipe($.if(/\.css$/, $.cssnano({ safe: true, autoprefixer: false })))
    .pipe($.if(/\.html$/, $.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: { compress: { drop_console: true } },
      processConditionalComments: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true
    })))
    .pipe(dest('dist'));
}

// Images
function images() {
  return src('app/images/**/*')
    .pipe($.cache($.imagemin()))
    .pipe(dest('dist/images'));
}

// Fonts
function fonts() {
  // Only use your app/fonts directory
  return src('app/fonts/**/*')
    .pipe($.if(dev, dest('.tmp/fonts'), dest('dist/fonts')));
}

// Extras
function extras() {
  return src(['app/*', '!app/*.html'], { dot: true })
    .pipe(dest('dist'));
}

// Clean
function clean() {
  return del(['.tmp', 'dist']);
}

// Serve (dev)
function serve(done) {
  dev = true;
  series(clean, parallel(styles, scripts, fonts))(function () {
    browserSync.init({
      notify: false,
      port: 9000,
      server: {
        baseDir: ['.tmp', 'app']
      }
    });

    watch('app/*.html').on('change', reload);
    watch('app/images/**/*').on('change', reload);
    watch('.tmp/fonts/**/*').on('change', reload);
    watch('app/styles/**/*.css', styles);
    watch('app/scripts/**/*.js', scripts);
    watch('app/fonts/**/*', fonts);

    done();
  });
}

// Serve dist (production)
function serveDist(done) {
  browserSync.init({
    notify: false,
    port: 9000,
    server: { baseDir: ['dist'] }
  });
  done();
}

// Serve test
function serveTest(done) {
  series(scripts)(function () {
    browserSync.init({
      notify: false,
      port: 9000,
      ui: false,
      server: {
        baseDir: 'test',
        routes: {
          '/scripts': '.tmp/scripts'
        }
      }
    });

    watch('app/scripts/**/*.js', scripts);
    watch(['test/spec/**/*.js', 'test/index.html']).on('change', reload);
    watch('test/spec/**/*.js', lintTest);

    done();
  });
}

// Build
function buildTask(done) {
  dev = false;
  series(clean, lintApp, parallel(html, images, fonts, extras))(done);
}

// Exports
exports.styles = styles;
exports.scripts = scripts;
exports.lint = lintApp;
exports['lint:test'] = lintTest;
exports.html = html;
exports.images = images;
exports.fonts = fonts;
exports.extras = extras;
exports.clean = clean;

exports.serve = serve;
exports['serve:dist'] = series(buildTask, serveDist);
exports['serve:test'] = serveTest;

exports.build = buildTask;
exports.default = buildTask;
