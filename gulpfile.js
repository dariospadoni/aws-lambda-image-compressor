'use strict';
require('dotenv').config();
var gulp = require('gulp');
var zip = require('gulp-zip');
var del = require('del');
var install = require('gulp-install');
var runSequence = require('run-sequence');
var awsLambda = require('node-aws-lambda');

var pkg = require('./package.json');

var packageFile = pkg.name + '_' + pkg.version + '_' + '.zip';

gulp.task('clean', function () {
  return del(['./dist', './build']);
});

gulp.task('js', function () {
  return gulp.src('./src/index.js')
    .pipe(gulp.dest('build/'));
});

gulp.task('env', function () {
  return gulp.src('.env')
    .pipe(gulp.dest('build/'));
});

gulp.task('node-mods', function () {
  return gulp.src('./package.json')
    .pipe(gulp.dest('build/'))
    .pipe(install({production: true}));
});

gulp.task('zip', function () {
  return gulp.src(['build/**/*', '!build/package.json'], {
      dot: true
    })
    .pipe(zip(packageFile))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('upload', function (callback) {
  awsLambda.deploy('./dist/' + packageFile, require('./lambda-config.js'), callback);
});


gulp.task('deploy', function (callback) {
  return runSequence(
    ['clean'],
    ['js', 'env', 'node-mods'],
    ['zip'],
    ['upload'],
    callback
  );
});