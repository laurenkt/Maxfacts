import express    from "express"
import session    from "express-session"
import morgan     from "morgan"
import chalk      from "chalk"
import bodyParser from "body-parser"
import mongoose   from "mongoose"
import mongoStore from "connect-mongo"
import passport   from "passport"
import {Strategy} from "passport-google-oauth20"
import {join}     from "path"
import hbs        from "express-handlebars"

// Set-up Mongoose models
mongoose.Promise = global.Promise // Required to squash a deprecation warning
mongoose.connect(process.env.MONGO_URI).connection
	.on("error", console.error.bind(console, "connection error:"))

// Start Express
const app = express()

// Views in templates/ using handlebars.js
app.engine("hbs", hbs({
	extname:       ".hbs",
	defaultLayout: "main",
	layoutsDir:    join(__dirname, "templates", "layouts"),
	partialsDir:   join(__dirname, "templates", "partials"),
	helpers: {
		toJSON: obj => JSON.stringify(obj),
	},
}))
app.set("view engine", "hbs")
app.set("views", join(__dirname, "templates"))
app.use((req, res, next) => { res.locals.path = req.path; next(); }) // make path available to templates

// Logging in the console
// Don't log in test runner
if (!process.env.TEST) {
	morgan.token("time", () => `${(new Date()).getHours()}:${(new Date()).getMinutes()}`)
	morgan.token("cstatus", (req, res) => {
		const code = res.statusCode
		const colorer = code >= 500 ? chalk.white
			: code >= 400 ? chalk.yellow
			: code >= 300 ? chalk.cyan
			: code >= 200 ? chalk.green
			: chalk.white

		return colorer(code)
	})
	app.use(morgan(`\u2753 ${chalk.yellow("Request:")} :method ${chalk.inverse(":url")} (:time)`, {immediate:true}))
	app.use(morgan(`\u2755 ${chalk.green("Response:")} :method ${chalk.inverse(":url")} :cstatus :response-time ms - :res[content-length]`))
}

// Process POST request bodies
app.use(bodyParser.urlencoded({ extended: true }))

// Sessions
app.use(session({
	secret: "f8e1a0f9-e7a9-4e0d-8a2e-0624a3f62510", // Just a generated UUID
	saveUninitialized: false,
	resave: false,
	store: new (mongoStore(session))({mongooseConnection: mongoose.connection}), // Store session data in mongodb
}))

passport.use(new Strategy({
	clientID:     process.env.OAUTH_CLIENTID,
	clientSecret: process.env.OAUTH_SECRET,
	callbackURL:  process.env.OAUTH_CALLBACK,
}, (accessToken, refreshToken, profile, cb) => {
	const email = profile.emails[0].value
	// Must be a York e-mail
	if (email.match(/.*@york\.ac\.uk/i) !== null) {
		cb(null, email)
	}
	else {
		cb({error: "Invalid email"}, null)
	}
}
))

passport.serializeUser((user, cb)  => cb(null, user))
passport.deserializeUser((obj, cb) => cb(null, obj))

app.use(passport.initialize())
app.use(passport.session())

// Middleware for static files into static/
app.use(express.static(join(__dirname, "static")))

// Loads the named module from the routes/ directory
const route = (name) => require(join(__dirname, "routes", name))

app.use("/",               route("feedback"))
app.use("/",               route("images"))
app.use("/",               route("videos"))
app.use("/magic-triangle", route("magic_triangle"))
app.use("/dashboard",      route("dashboard"))
app.use("/search",         route("search"))
app.use("/",               route("index"))

app.get("/auth", passport.authenticate("google", { scope: ["email"] } ))
app.get("/auth/callback",
	passport.authenticate("google", { successReturnToOrRedirect: "/", failureRedirect: "/error" }))

// If nothing is found
app.use((req, res, next) => {
	const err = new Error("Not Found")
	err.status = 404
	next(err) // pass to error handler
})

// Error handler
app.use((err, req, res, _) => {
	let errInfo = {}

	// Show more information if development
	if (app.get("env") === "development") {
		// Don't bother logging a stack trace for 404 errors
		if (err.status != 404)
			console.error(err.stack)

		errInfo = err
	}

	res.status(err.status || 500)
	res.render("error", {
		message: err.message,
		error: errInfo,
	})
})

export default app
// $FlowFixMe: needed for test runner
module.exports = app
