import gulp         from 'gulp'
import sass         from 'gulp-sass'
import autoprefixer from 'gulp-autoprefixer'
import sourcemaps   from 'gulp-sourcemaps'
import uglifycss    from 'gulp-uglifycss'
import uglify       from 'gulp-uglify'
import babel        from 'gulp-babel'
import imgmin       from 'gulp-imagemin'
import del          from 'del'
import webpack      from 'webpack'
import webpackGulp  from 'webpack2-stream-watch'

// To debug cryptic child process errors
(function() {
    var childProcess = require("child_process");
    var oldSpawn = childProcess.spawn;
    function mySpawn() {
        console.log('spawn called');
        console.log(arguments);
        var result = oldSpawn.apply(this, arguments);
        return result;
    }
    childProcess.spawn = mySpawn;
})()

const dirs = {
	dest: 'build',
}

const apps = [
	'editor',
	'multipart-player',
	'recipe-browser',
]

gulp.task('clean', () => {
	return del(dirs.dest)
})

gulp.task('watch', () => {
	gulp.watch('./static/js/**/*.js',    ['static_js'])
	gulp.watch('./static/css/**/*.scss', ['css'])
	gulp.watch('./templates/**/*.hbs',   ['templates'])
	gulp.watch('./static/images/**/*',   ['images'])
	gulp.watch('./test/*.js',            ['tests'])

	apps.forEach(app => {
		gulp.watch(`./client/${app}/**/*`, [app])
	})

	gulp.watch([
		'./**/*.js',
		'!./static/**/*.js',        // ignore client JS
		'!./flow-typed/**/*.js',    // ignore client JS
		'!./coverage/**/*.js',      // ignore client JS
		'!./test/**/*.js',          // ignore client JS
		'!./client/**/*.js',        // ignore client JS
		'!./build/**/*.js',         // ignore built JS
		'!./node_modules/**/*.js',  // ignore node module JS
		'!./gulpfile.babel.js',     // ignore node module JS
	], ['server'])
})

gulp.task('css', () => {
	return gulp.src('static/css/*.scss')
		.pipe(sourcemaps.init())
		.pipe(sass.sync().on('error', sass.logError))
		.pipe(autoprefixer())
		.pipe(uglifycss())
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(`${dirs.dest}/static/css`))
})

apps.forEach(app => {
	const webpackConfig = require(`./client/${app}/webpack.config.babel.js`)(process.env)

	if (!process.env.DEBUG) {
		webpackConfig.plugins = [
			new webpack.LoaderOptionsPlugin({
				minimize: true,
				debug: false
			}),
			new webpack.optimize.UglifyJsPlugin({
				beautify: false,
				mangle: {
					screw_ie8: true,
					keep_fnames: true
				},
				compress: {
					screw_ie8: true
				},
				comments: false
			})
		]	
	}

	gulp.task(app, () => {
		return gulp.src(`client/${app}/app.js`)
			.pipe(webpackGulp(webpackConfig, webpack))
			.pipe(gulp.dest(`${dirs.dest}/static/js`))
	})
})

gulp.task('server', () => {
	return gulp.src([
		'!static/**/',        // ignore client JS
		'!flow-typed/**/',    // ignore client JS
		'!coverage/**/',      // ignore client JS
		'!test/**/',          // ignore client JS
		'!client/**/',        // ignore client JS
		'!build/**/',         // ignore built JS
		'!node_modules/**/',  // ignore node module JS
		'!gulpfile.babel.js', // ignore node module JS
		'**/*.js',
	])
		.pipe(sourcemaps.init())
		.pipe(babel())
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(dirs.dest))
})

gulp.task('images', () => {
	return gulp.src('static/images/*')
		.pipe(imgmin())
		.pipe(gulp.dest(`${dirs.dest}/static/images`))
})

gulp.task('static_js', () => {
	return gulp.src('static/js/*.js')
		.pipe(gulp.dest(`${dirs.dest}/static/js`))
})

gulp.task('bin', () => {
	return gulp.src('bin/*')
		.pipe(gulp.dest(`${dirs.dest}/bin`))
})

gulp.task('templates', () => {
	return gulp.src('**/*.hbs')
		.pipe(gulp.dest(dirs.dest))
})

gulp.task('tests', () => {
	return gulp.src('test/*.js')
		.pipe(sourcemaps.init())
		.pipe(babel())
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(`${dirs.dest}/test`))
})

gulp.task('other', () => {
	return gulp.src('static/*')
		.pipe(gulp.dest(`${dirs.dest}/static`))
})

gulp.task('js', apps.concat('static_js'))

gulp.task('default', ['bin', 'images', 'css', 'other', 'js', 'templates', 'server', 'tests'])
