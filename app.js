// Import environment variables from .env
require("dotenv").config();

import express     from "express";
import session     from "express-session";
import morgan      from "morgan";
import chalk       from "chalk";
import bodyParser  from "body-parser";
import mongoose    from "mongoose";
import mongoStore  from "connect-mongo";
import browserify  from "browserify-middleware";
import sass        from "node-sass-middleware";
import {join}      from "path";

// Set-up Mongoose models
mongoose.Promise = global.Promise; // Required to squash a deprecation warning
mongoose.connect(process.env.MONGO_URI).connection
	.on("error", console.error.bind(console, "connection error:"));

// Start Express
const app = express();

// Views in views/ using handlebars.js
app.set("views", join(__dirname, "templates"));
app.set("view engine", "hbs");

// Logging in the console
morgan.token("time", () => `${(new Date()).getHours()}:${(new Date()).getMinutes()}`);
morgan.token("cstatus", (req, res) => {
	var code = res.statusCode;
	var colorer = code >= 500 ? chalk.white
		: code >= 400 ? chalk.yellow
		: code >= 300 ? chalk.cyan
		: code >= 200 ? chalk.green
		: chalk.white;

	return colorer(code);
});
app.use(morgan(`\u2753 ${chalk.yellow("Request:")}  :method ${chalk.inverse(":url")} (:time)`, {immediate:true}));
app.use(morgan(`\u2755 ${chalk.green("Response:")} :method ${chalk.inverse(":url")} :cstatus :response-time ms - :res[content-length]`));

// Process POST request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Sessions
app.use(session({
	secret: "f8e1a0f9-e7a9-4e0d-8a2e-0624a3f62510", // Just a generated UUID
	saveUninitialized: false,
	resave: false,
	store: new (mongoStore(session))({mongooseConnection: mongoose.connection}), // Store session data in mongodb
}));

// Babel for React/JSX
app.use("/js", browserify(join(__dirname, "client"), {
	noParse: ["react-rte"],
	transform: ["babelify"],
}));

// SASS middleware
app.use(sass({
	src:  join(__dirname, "static"),
	dest: join(__dirname, "static"),
	sourceMap: true,
	error: console.error.bind(console, "sass error: "),
}));

// Middleware for static files into static/
app.use(express.static(join(__dirname, "static")));

// Loads the named module from the routes/ directory
const route = (name) => require(join(__dirname, "routes", name));

app.use("/",               route("images"));
app.use("/magic-triangle", route("magic_triangle"));
app.use("/dashboard",      route("dashboard"));
app.use("/search",         route("search"));
app.use("/",               route("index"));

// If nothing is found
app.use((req, res, next) => {
	var err = new Error("Not Found");
	err.status = 404;
	next(err); // pass to error handler
});

// Error handler
app.use((err, req, res, _) => {
	var errInfo = {};

	// Show more information if development
	if (app.get("env") === "development") {
		console.error(err.stack);
		errInfo = err;
	}

	res.status(err.status || 500);
	res.render("error", {
		message: err.message,
		error: errInfo,
	});
});

export default app;
