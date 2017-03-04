var gulp = require('gulp');
var sass = require('gulp-sass');

var style = './docs/assets/css/style.scss';

gulp.task('scss-docs', function () {
    return gulp.src(style)
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./docs/assets/css'));
});

// Rerun the task when a file changes
gulp.task('watch-docs', function () {
    gulp.watch(style, ['scss-docs']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['watch-docs', 'scss-docs']);