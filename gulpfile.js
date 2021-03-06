"use strict";

var gulp = require('gulp');

// ** UTILITY PLUGINS ** //
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var del = require('del');
var filter = require('gulp-filter');
var watch = require('gulp-watch');
var debug = require('gulp-debug');
var gulpif = require('gulp-if');
var rsync = require('gulp-rsync');
var argv = require('yargs').argv;
var po2json = require('gulp-po2json');
var mainBowerFiles = require('main-bower-files');
var addsrc = require('gulp-add-src');
var vfs = require('vinyl-fs');

// ** SASS/SCSS/CSS PLUGINS ** //
var sass = require('gulp-sass');
var sassError = require('gulp-sass-error').gulpSassError;

// ** JAVASCRIPT PLUGINS ** //
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var sourcemaps = require('gulp-sourcemaps');

// ** IMAGE OPTIMISATION PLUGINS ** //
var imagemin = require('gulp-imagemin');
var pngquant = require('imagemin-pngquant');
var optipng = require('imagemin-optipng');
var jpegoptim = require('imagemin-jpegoptim');

// ** SETTINGS ** //
// To build production site, run: gulp --production
var production = !!(argv.production);
var throwError = true;

// JAVASCRIPT HINTING
gulp.task('jshint', function() {
    return gulp.src('meerkat_frontend/src/js/**/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter("fail"));
});

// JAVASCRIPT TASKS
gulp.task('vendorJS', function() {
    return gulp.src( mainBowerFiles().concat([
        'node_modules/tree-model/dist/TreeModel-min.js',
        'bower_components/bootstrap-table/src/locale/bootstrap-table-en-US.js',
        'bower_components/jed/jed.js',
        'bower_components/highcharts/modules/treemap.js',
        'bower_components/highcharts/modules/broken-axis.js'
    ]))
    .pipe(filter('*.js'))
    .pipe(gulpif(production, uglify()))
    .pipe(vfs.dest('meerkat_frontend/static/js'));
});

gulp.task('locales', function() {
    return gulp.src(['bower_components/moment/locale/fr.js'])
        .pipe(filter('*.js'))
        .pipe(gulpif(production, uglify()))
        .pipe(vfs.dest('meerkat_frontend/static/js/locale'));
});

gulp.task('appJS', function() {
    return gulp.src(['meerkat_frontend/src/js/**/*.js'])
        .pipe(concat('app.js'))
        .pipe(gulpif(production, uglify()))
        .pipe(vfs.dest('meerkat_frontend/static/js'));
});

gulp.task('js', gulp.parallel('vendorJS', gulp.series('jshint', 'appJS')));

// Hacky hacky hack to get mapbox.css as scss for SASS to compile it...
gulp.task('mapbox-rename-css-to-scss', function() {
  return gulp.src([
      'bower_components/mapbox.js/mapbox.uncompressed.css',
      'bower_components/leaflet.markercluster/dist/MarkerCluster.css',
      'bower_components/leaflet.markercluster/dist/MarkerCluster.Default.css',
      'bower_components/intl-tel-input/build/css/intlTelInput.css',
      'bower_components/eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.css',
      'bower_components/bootstrap-table/src/bootstrap-table.css',
      'bower_components/featherlight/src/featherlight.css',
	  'bower_components/leaflet.awesome-markers/dist/leaflet.awesome-markers.css'
    ])
    .pipe(rename(function(path) {
        path.extname = ".scss"
    }))
    .pipe(vfs.dest('meerkat_frontend/src/sass/autogenerated'));
});

// SASS/CSS TASKS
gulp.task('sass', function(){
    return gulp.src('meerkat_frontend/src/sass/main.scss')
        .pipe(gulpif(
            production,
            sass({
                outputStyle: 'compressed'
            }).on('error', sassError(throwError)),
            sass({
                  outputStyle: 'expanded'
            }).on('error', sassError(throwError))
        ))
        .pipe(vfs.dest('meerkat_frontend/static/css'));
});

gulp.task('styles', gulp.series('mapbox-rename-css-to-scss', 'sass'));

gulp.task('vendor-css', function(){
    return gulp.src(mainBowerFiles())
        .pipe( filter('*.css') )
        .pipe(vfs.dest('meerkat_frontend/static/css/'));
});

// FONT TASKS
gulp.task('fonts', function() {
    return gulp.src([
        'bower_components/fontawesome/fonts/*',
        'bower_components/bootstrap-sass/assets/fonts/bootstrap/*'
    ]).pipe(vfs.dest('meerkat_frontend/static/fonts'));
});

// IMG TASKS
gulp.task('copyFlags', function() {
    return gulp.src([
        'bower_components/flag-icon-css/flags/**/*',
        'meerkat_frontend/src/img/flags/**/*'
    ])
    .pipe(vfs.dest('meerkat_frontend/static/img/flags'));
});

gulp.task('copyFavicon', function() {
    return gulp.src([
        'meerkat_frontend/src/favicon.ico'
    ])
    .pipe(vfs.dest('meerkat_frontend/static/'));
});

gulp.task('copyMapMarkers', function() {
	return gulp.src([
        'bower_components/mapbox.js/images/**/*',
		'bower_components/leaflet.awesome-markers/dist/images/**/*'
	])
    .pipe(vfs.dest('meerkat_frontend/static/css/images'));
});

gulp.task('img-opt', function(){
    return gulp.src([
        'meerkat_frontend/src/img/**/*.{gif,jpg,png,svg}',
        'bower_components/Leaflet.fullscreen/src/*.png',
        'bower_components/intl-tel-input/build/img/*.png',
        '!meerkat_frontend/src/img/optimised/*.{gif,jpg,png,svg}'
    ]).pipe(imagemin({
        optimizationLevel: 3,
        progressive: true,
        svgoPlugins: [{
            removeViewBox: false
        }],
        use: [
            pngquant(),
            optipng({optimizationLevel: 3}),
            jpegoptim({max: 50,progressive: true}),
        ]
    }))
    .pipe(addsrc('meerkat_frontend/src/img/optimised/*.{gif,jpg,png,svg}'))
    .pipe(vfs.dest('meerkat_frontend/static/img/'));
});

gulp.task(
    'img',
    gulp.series(gulp.parallel(
      'copyFlags',
      'copyMapMarkers',
      'copyFavicon'
    ), 'img-opt')
);

//COPY OTHER FILES
gulp.task( 'files', function(){
    return gulp.src([
        'meerkat_frontend/src/files/*',
        'meerkat_frontend/src/files/**/*'
    ])
    .pipe(vfs.dest('meerkat_frontend/static/files'));
});

// WATCH TASKS
gulp.task('watch', function() {
    var watchFiles = [
        'meerkat_frontend/src/js/*.js',
        'meerkat_frontend/src/img/**/*.{gif,png,jpg,svg}',
        'meerkat_frontend/src/sass/**/*.scss'
    ];
    gulp.watch(watchFiles, ['default']);
});

gulp.task('sass:watch', function() {
    gulp.watch('meerkat_frontend/src/sass/**/*', ['sass']);
});

//LANGUAGE TASKS
gulp.task('po2json', function () {
    return gulp.src(['meerkat_frontend/translations/*/LC_MESSAGES/messages.po'])
           .pipe(debug())
           .pipe(po2json({format:"jed1.x"}))
           .pipe(vfs.dest('meerkat_frontend/static/translations'));
});

// CLEAN TASKS
gulp.task('clean', function(done) {
    del([
        'meerkat_frontend/src/sass/autogenerated/**/*',
        'meerkat_frontend/static/css/**/*',
        'meerkat_frontend/static/js/**/*',
        'meerkat_frontend/static/fonts/**/*',
        'meerkat_frontend/static/img/**/*.{gif,jpg,png,svg}',
        'meerkat_frontend/static/translations/**/*.json'
    ]);
    done();
});


// DEFAULT TASK , 'fonts', 'img', 'files', 'vendor-css', 'po2json', 'locales'
gulp.task('default', gulp.series('clean', gulp.parallel(
    'styles', 'js' , 'fonts', 'files', 'vendor-css', 'po2json', 'locales','img'
)));
