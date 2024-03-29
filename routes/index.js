import express      from 'express'
import Content      from '../models/content'
import Option       from '../models/option.js'
// import sanitizeHtml from 'sanitize-html'
import {zipObject}  from 'lodash'

const router = express.Router()

router.get('/',        requestLandingPage)
router.get('/:uri(*)', requestSpecificPage)

/**
 * Landing page
 */
async function requestLandingPage(req, res) {
	// The three pillars of the home-page
	const [diagnosis, treatment, help] = await Promise.all([
		Content.findFromParentURI('diagnosis').sort('title').exec(),
		Content.findFromParentURI('treatment').sort('title').exec(),
		Content.findFromParentURI('help').sort('title').exec(),
	])

	// Use alternative layout
	res.render('index', {diagnosis, treatment, help, layout:'home'})
}

/*
 * Render a particular page
 */
async function requestSpecificPage(req, res, next) {
	const content = await Content.findOne( { uri: req.params.uri } )

	if (!content)
		return next()

	// First check redirect condition
	if (content.redirect_uri && content.redirect_uri !== "")
		return res.redirect('/' + content.redirect_uri)

	// Use stand-in body if there isn't one
	if (!content.body)
		content.body = (await Content.findOne({uri: await Option.get('placeholder_uri')})).body

	content.invalid_uris = await content.getInvalidLinks()
	content.breadcrumbs  = await content.getBreadcrumbs()
	content.next_page    = await content.getNextPage()

	if (content.further_reading_uri && content.further_reading_uri !== "")
		content.further_reading = await Content.findOne( {uri: content.further_reading_uri} )
	
	// Only do this step if it's a directory
	if (content.type == "directory") {
		const queryForMenus = query => query.where('type').ne('further').sort('order title subtitle surtitle').exec()

		const directory = await Promise.all(
			content.lineage
				// Get links from all parent stages
				.map(uri => queryForMenus(Content.findFromAdjacentURI(uri).where("hide", false).select("-body")))
				// Append siblings of the current page
				.concat([queryForMenus(Content.findFromAdjacentURI(content.uri).where("hide", false).select("-body"))])
				// Append children of the current page (excluding ones with the same name)
				.concat([queryForMenus(Content.findFromParentURI(content.uri).where("hide", false).where("title").ne(content.title))])
		)

		// Transform directory, adding sublists as necessary
		// TODO: this is really a promise mess - there must be a clearer way to structure this
		// Essentially return a composed promise of all columns, for each column return a composed promise
		// of creating a sublist entry for each item which has a sublist (this must be a promise as it hits
		// the DB)
		await Promise.all(
			directory.map(column => Promise.all(column
				.filter(c => c.has_sublist)
				.map(async c =>
					c.sublist = await Content.findFromParentURI(c.uri).select("-body").where('type').ne('further').sort("order title").exec()
				)
			))
		)

		// If this page has a sublist, don't display children (they will be displayed in the parent list)
		if (content.has_sublist)
			directory.pop()

		content.directory = directory.filter(list => list.length > 0) // The rest are the directory (assuming they have at least 1 item)

		// Provide a way for the template to lookup whether a URI is selected
		content.selected = {}
		content.lineage.forEach(uri => content.selected[uri] = "-selected")
		// The current page too
		content.selected[content.uri] = "-selected"

		// Pass on how many levels there are in this branch
		content.depth = content.directory.length
	}
	else if (content.type == "alphabetical") {
		const children = await content.getChildren()
		const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('')
		content.alphabetical = zipObject(alphabet, alphabet.map(letter => children.filter(c => c.title[0] == letter)))
	}

	// Render page

	// Editor URI
	content.edit_uri = "/dashboard/directory/" + content.uri

	// Handlebar local helper
	content.helpers = {
		// TODO: Move this into a separate handler
		shift_headers: (offset, text) => {
			const sanitizeHtml = x => x // TOOD fix

			const headers = ["h1", "h2", "h3", "h4", "h5", "h6"]
			let transform = {}

			for (let i = 0; i < 6; i++) {
				// Don"t go off the edge of the array
				transform[headers[i]] = headers[Math.min(i + offset, 5)]
			}

			// Allow everything - it is not the job of this helper to sanitize
			// inputs
			return sanitizeHtml(text, {
				allowedTags:       false,
				allowedAttributes: false,
				transformTags:     transform,
			})
		},
	}

	// Render different content types with different templates
	res.render(content.type, content)
}

module.exports = router
