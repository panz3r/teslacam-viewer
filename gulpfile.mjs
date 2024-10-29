import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import rollup from "@rollup/stream";
import gulp from "gulp";
import gulpPug from "gulp-pug";
import { rimraf } from "rimraf";
import source from "vinyl-source-stream";
import buffer from "vinyl-buffer";

const BUILD_DIRECTORY = ".cache";
const PACKAGE_DIRECTORY = "dist";

// copy assets to build directory
function copyAssets() {
  return gulp
    .src("src/assets/**/*", { base: "src/", encoding: false })
    .pipe(gulp.dest(BUILD_DIRECTORY, { mode: 0o644, dirMode: 0o755 }));
}

function copyTemplate() {
  return gulp.src("src/**/*.pug", { base: "src/" }).pipe(gulp.dest(BUILD_DIRECTORY, { mode: 0o644, dirMode: 0o755 }));
}

const copyStaticAssets = gulp.parallel(copyAssets, copyTemplate);

function buildCss() {
  return gulp.src("src/**/*.css", { base: "src/" }).pipe(gulp.dest(BUILD_DIRECTORY, { mode: 0o644, dirMode: 0o755 }));
}

function buildJs() {
  return rollup({ input: "./src/js/index.js", output: { format: "iife" } })
    .pipe(source("js/index.js"))
    .pipe(buffer())
    .pipe(gulp.dest(BUILD_DIRECTORY));
}

const buildSource = gulp.parallel(buildCss, buildJs);

// builds index.html from index.pug etc.
function buildHtml() {
  return gulp
    .src(`${BUILD_DIRECTORY}/index.pug`)
    .pipe(gulpPug({ data: require("./package.json"), pretty: false })) // true adds extra spaces :-(
    .pipe(gulp.dest(PACKAGE_DIRECTORY, { mode: 0o644 }));
}

const cleanBuildFolder = () => rimraf(BUILD_DIRECTORY);

const cleanPackageFolder = () => rimraf(PACKAGE_DIRECTORY);

// npm run clean / npx gulp clean: clean '.cache' and 'dist' folder
export const clean = gulp.parallel(cleanBuildFolder, cleanPackageFolder);

// npm run build / npx gulp build: build index.html and assets
export const build = gulp.series(copyStaticAssets, buildSource, buildHtml);

// npm run dist / npx gulp dist: copy just needed files to `dist` directory
export const dist = gulp.series(clean, build);

// watch files for changes and trigger rebuild tasks
async function watchFiles() {
  gulp.watch("src/assets/*", gulp.series(copyAssets, buildHtml));
  gulp.watch("src/**/*.{js,css}", gulp.series(buildSource, buildHtml));
  gulp.watch("src/**/*.pug", gulp.series(copyTemplate, buildHtml));
}

// npm run watch / npx gulp watch: continuously update index.html from deps
export const watch = gulp.series(cleanBuildFolder, build, watchFiles);

export default build;
