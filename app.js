// Import environment variables from .env
require('dotenv').config();

const express      = require('express');
const join         = require('path').join;
const favicon      = require('serve-favicon');
const morgan       = require('morgan');
const chalk        = require('chalk');
const cookieParser = require('cookie-parser');
const bodyParser   = require('body-parser');
const mongoose     = require('mongoose');
const fs           = require('fs');
const browserify   = require('browserify-middleware');
const sass         = require('node-sass-middleware');

// Set-up Mongoose models
mongoose.Promise = global.Promise; // Required to squash a deprecation warning
const db = mongoose.connect(process.env.MONGO_URI).connection
	.on('error', console.error.bind(console, 'connection error:'))

// Start Express
const app = express();

// Views in views/ using handlebars.js
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Logging in the console
app.use(morgan(`\u2753 ${chalk.yellow('Request:')}: :method ${chalk.inverse(':url')}`, {immediate:true}));
app.use(morgan(`\u2755 ${chalk.green('Response:')} :method ${chalk.inverse(':url')} :status :response-time ms - :res[content-length]`));

// Process POST request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Babel for React/JSX
app.use('/js', browserify(join(__dirname, 'client'), {
	noParse: ['react-rte'],
	transform: ['babelify']
}));

// SASS middleware
app.use(sass({
	src:  join(__dirname, 'static'),
	dest: join(__dirname, 'static'),
	sourceMap: true,
	error: console.error.bind(console, 'sass error: ')
}));

// Middleware for static files into static/
app.use(express.static(join(__dirname, 'static')));

// Loads the named module from the routes/ directory
const route = (name) => require(join(__dirname, 'routes', name));

app.use('/',               route('images'));
app.use('/magic-triangle', route('magic_triangle'));
app.use('/editor',         route('editor'));
app.use('/',               route('index'));

// If nothing is found
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err); // pass to error handler
});

// Error handler
app.use(function(err, req, res, next) {
	var errInfo = {};

	// Show more information if development
	if (app.get('env') === 'development') {
		console.error("RequestUrl:", chalk.inverse(req.originalUrl));
		console.error(err.stack);
		errInfo = err;
	}

	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: errInfo
	});
});

module.exports = app;
