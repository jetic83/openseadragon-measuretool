'use strict';

var gulp = require('gulp');
var header = require('gulp-header');
var plugins = require('gulp-load-plugins')();
var git = require('gulp-git');



var pkg = require('./package.json');
var banner = ['/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @Commit: <%= vers %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''].join('\n');

gulp.task('uglify', function() {
    return git.exec({args : 'describe --always', quiet : false}, function (err, stdout) {
        var vers = stdout.toString().trim();
      
        return gulp.src([
                './src/*.js',
            ])
            .pipe(plugins.plumber({
                errorHandler: handleError
            }))
            .pipe(plugins.jshint())
            .pipe(plugins.jshint.reporter('jshint-stylish'))
            .pipe(plugins.sourcemaps.init())
            .pipe(plugins.concat('openseadragon-measuretool.min.js'))
            .pipe(plugins.uglify())
            .pipe(header(banner, {
                pkg : pkg, 
                vers : vers } ))
            .pipe(plugins.sourcemaps.write('./'))
            .pipe(gulp.dest('./dist'));
    });
});

gulp.task('watch', ['uglify'], function () {
    gulp.watch('./src/*.js', ['uglify']);
});

gulp.task('serve', plugins.serve({
    root: ['dist', 'images'],
    port: 4040,
}));

gulp.task('default', ['watch', 'serve']);


/**
 * Displays error message in the console
 * @param error
 */
function handleError(error) {
    plugins.util.beep();
    plugins.util.log(plugins.util.colors.red(error));
}
