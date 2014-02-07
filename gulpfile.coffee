gulp = require 'gulp'
gutil = require 'gulp-util'
coffee = require 'gulp-coffee'

paths =
  coffee: './src/**/*.coffee'

gulp.task 'coffee', ->
  gulp.src paths.coffee
    .pipe coffee(bare: true).on 'error', gutil.log
    .pipe gulp.dest './lib'

gulp.task 'watch', ->
  gulp.watch paths.coffee, ['coffee']

gulp.task 'default', ['coffee']
