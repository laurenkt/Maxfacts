import express    from 'express'
import RateLimit  from 'express-rate-limit'
import nodemailer from 'nodemailer'
import isemail    from 'isemail'
import Content    from "../models/content"

const router = express.Router()

const limiter = new RateLimit({
	windowMs: 60*60*1000, // 1-hour window
	max: 3,               // each IP max 3 requests per window
	delayMs: 30 * 1000,   // 30 secs delay
	message: "Too many messages sent from this IP, please try again later",
})

router.get('/register', getRegister)
router.post('/register', limiter, postRegister)
router.get('/feedback', getFeedback)
router.post('/feedback', limiter, postFeedback)
router.get('/:uri(*)/feedback', getFeedback)
router.post('/:uri(*)/feedback', limiter, postFeedback)

async function getRegister(req, res) {
	res.render('register', {})
}

async function postRegister(req, res) {
	if (req.body.email && req.body.email !== "" && isemail.validate(req.body.email)) {
		req.body.message = "AUTOMATED EMAIL REQUEST: ADD TO MAILING LIST: " + req.body.email
		return postFeedback(req, res)
	}
	else 
		res.render('register', {emailaddr: req.body.email})
}

async function getFeedback(req, res) {
	let breadcrumbs = []

	if (req.params.uri) {
		const content = await Content.findOne( { uri: req.params.uri } )
		if (content) {
			breadcrumbs = await content.getBreadcrumbs()
			breadcrumbs.push(content)
		}
	}

	res.render('feedback', {
		emailaddr: req.body.email,
		message: req.body.message,
		breadcrumbs
	})
}

let transporter = nodemailer.createTransport({
	host: process.env.MAILER_HOST,
	port: process.env.MAILER_PORT,
	secure: true,
	auth: {
		user: process.env.MAILER_USER,
		pass: process.env.MAILER_PASS
	}
})

async function postFeedback(req, res) {
	let from = "no-reply@maxfacts.uk"
	let sender = from

	if (req.body.email && req.body.email !== "") {
		if (!isemail.validate(req.body.email)) {
			return getFeedback(req, res)
		}
	}

	if (!req.body.message || req.body.message == "")
		return getFeedback(req, res)

	const text = `
From: ${req.body.email || 'not specified'}
Regarding: ${'https://maxfacts.uk/' + (req.params.uri || '')}
Message:

${req.body.message.substr(0, 1000)}`

 	// don't need to keep connection open to send email
	// in fact, we shouldn't as it leaks information about the email sending
	// to the client
	res.render('feedback-confirmation', {})

	try {
	    let mail = {
			from,
			sender,
			to: "feedback@maxfacts.uk",
			subject: "Feedback",
			text
		}
		process.stdout.write(JSON.stringify(mail))
		process.stdout.write("\n")
		await transporter.sendMail(mail)
	} catch (e) {
		process.stdout.write("error encountered")
		process.stdout.write("\n")
		process.stdout.write(JSON.stringify(e))
		process.stdout.write("\n")
	}
}

module.exports = router
