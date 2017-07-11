import gulp         from 'gulp'
import sass         from 'gulp-sass'
import autoprefixer from 'gulp-autoprefixer'
import sourcemaps   from 'gulp-sourcemaps'
import uglifycss    from 'gulp-uglifycss'
import uglify       from 'gulp-uglify'
import babel        from 'gulp-babel'
import imgmin       from 'gulp-imagemin'
import rename       from 'gulp-rename'
import del          from 'del'

const dirs = {
	dest: 'build',
}

gulp.task('clean', () => {
	return del(dirs.dest)
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

gulp.task('js', () => {
	return gulp.src('static/js/*/app.js')
		.pipe(sourcemaps.init())
		.pipe(uglify())
		.pipe(rename({suffix: '.min'}))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(`${dirs.dest}/static/js`))
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

gulp.task('bin', () => {
	return gulp.src('bin/*')
		.pipe(gulp.dest(`${dirs.dest}/bin`))
})

gulp.task('templates', () => {
	return gulp.src('**/*.hbs')
		.pipe(gulp.dest(dirs.dest))
})

gulp.task('other', () => {
	return gulp.src('static/*')
		.pipe(gulp.dest(`${dirs.dest}/static`))
})

gulp.task('default', ['bin', 'images', 'css', 'other', 'js', 'templates', 'server'])
