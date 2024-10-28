import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import gulp from "gulp";
import gulpPug from "gulp-pug";
import { rimraf } from "rimraf";

const SOURCE_DIRECTORY = "src";
const PACKAGE_DIRECTORY = "dist";

// builds index.html from index.pug etc.
function buildHtml() {
  return gulp
    .src(`${SOURCE_DIRECTORY}/index.pug`)
    .pipe(gulpPug({ data: require("./package.json"), pretty: false })) // true adds extra spaces :-(
    .pipe(gulp.dest(PACKAGE_DIRECTORY, { mode: 0o644 }));
}

const cleanPackageFolder = () => rimraf(PACKAGE_DIRECTORY);

// npm run clean / npx gulp clean: clean '.cache' and 'dist' folder
export const clean = gulp.series(cleanPackageFolder);

// npm run build / npx gulp build: build index.html and assets
export const build = gulp.series(buildHtml);

// npm run dist / npx gulp dist: copy just needed files to `dist` directory
export const dist = gulp.series(clean, build);

// watch files for changes and trigger rebuild tasks
async function watchFiles() {
  gulp.watch("src/**/*.{pug,js,css}", buildHtml);
}

// npm run watch / npx gulp watch: continuously update index.html from deps
export const watch = watchFiles;

export default build;
