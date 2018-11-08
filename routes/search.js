import express from 'express';
import RateLimit from 'express-rate-limit'
import Content from '../models/content';
import {escapeRegExp} from "lodash"

const router = express.Router();

const limiter = new RateLimit({
	windowMs: 30*60*1000, // 10-minute window
	max: 20,
	delayAfter: 1,
	delayMs: 3 * 1000,   // 3 secs per request
	message: "Too many search requests sent from this IP, please try again later",
})

router.get('/', limiter, getSearchResults)

async function getSearchResults(req, res, next) {
	if (req.query.query) {
		res.locals.query = req.query.query

		const results = await Content
			.find(
				{ $text : { $search : req.query.query } }, 
				{ score : { $meta: "textScore" } }
			)
			.where('hide', false)
			.sort({ score : { $meta : 'textScore' } })
			.exec()

		let regexp = new RegExp('^([\\s\\S]*)(' + escapeRegExp(req.query.query) + ')([\\s\\S]*)$', 'i')

		for (let i = 0; i < results.length; i++) {
			let match = results[i].getMatchedParagraph(regexp)
			if (match !== null) {
				results[i].match = {
					before: match[1].length < 100 ? match[1] : match[1].replace(/^[\s\S]*?\b([\s\S]{0,100})*$/i, '...$1'),
					match: match[2],
					after: match[3].length < 100 ? match[3] : match[3].replace(/^([\s\S]{0,100})\b[\s\S]*$/i, '$1...'),
				}
			}
			results[i].breadcrumbs = await results[i].getBreadcrumbs()
		}

		res.render('search', {results});
	}
	else {
		res.render("search", {results:[]});
	}
}

module.exports = router;
