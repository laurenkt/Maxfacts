// Import environment variables from .env
require('dotenv').config();

const express      = require('express');
const join         = require('path').join;
const favicon      = require('serve-favicon');
const logger       = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser   = require('body-parser');
const mongoose     = require('mongoose');
const fs           = require('fs');
const browserify   = require('browserify-middleware');
const sass         = require('node-sass-middleware');

// Set-up Mongoose models
const db = mongoose.connect(process.env.MONGO_URI).connection
	.on('error', console.error.bind(console, 'connection error:'))
	.once('open', () => console.log('Mongoose: Connected'));

// Start Express
const app = express();

// Views in views/ using handlebars.js
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Logging in the console
app.use(logger('dev'));

// Process POST request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Babel for React/JSX
app.use('/js', browserify(join(__dirname, 'client'), {transform: ['babelify']}));

// SASS middleware
app.use(sass({
	src:  join(__dirname, 'public'),
	dest: join(__dirname, 'public'),
	sourceMap: true
}));

// Middleware for static files into static/
app.use(express.static(join(__dirname, 'static')));

// Loads the named module from the routes/ directory
const route = (name) => require(join(__dirname, 'routes', name));

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
