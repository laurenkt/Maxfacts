import express      from "express"
import Content      from "../models/content"
import sanitizeHtml from "sanitize-html"

const router = express.Router()

/**
 * Landing page
 */
router.get("/", async (req, res) => {
	// The three pillars of the home-page
	const [diagnosis, treatment, help] = await Promise.all([
		Content.findFromParentURI("diagnosis").sort("title").exec(),
		Content.findFromParentURI("treatment").sort("title").exec(),
		Content.findFromParentURI("help").sort("title").exec()
	])

	// Use alternative layout
	res.render("index", {diagnosis, treatment, help, layout:"home"})
});

/*
 * Render a particular page
 */
router.get("/:uri(*)", async (req, res, next) => {
	const content = await Content.findOne( { uri: req.params.uri } )

	if (!content)
		return next()

	content.invalid_uris = await content.getInvalidLinks()
	content.breadcrumbs  = await content.getBreadcrumbs()
	content.next_page    = await content.getNextPage()
	
	// Only do this step if it's a directory
	if (content.type == "directory") {
		const directory = await Promise.all(
			content.lineage
				// Get links from all parent stages
				.map(uri => Content.findFromAdjacentURI(uri).select("-body").sort("title").exec())
				// Append siblings of the current page
				.concat([Content.findFromAdjacentURI(content.uri).select("-body").sort("title").exec()])
				// Append children of the current page (excluding ones with the same name)
				.concat([Content.findFromParentURI(content.uri).where("title").ne(content.title).select("-body").sort("title").exec()])
		)

		// Transform directory, adding sublists as necessary
		// TODO: this is really a promise mess - there must be a clearer way to structure this
		// Essentially return a composed promise of all columns, for each column return a composed promise
		// of creating a sublist entry for each item which has a sublist (this must be a promise as it hits
		// the DB)
		await Promise.all(
			directory.map(column => Promise.all(column
				.filter(c => c.has_sublist)
				.map(c => Content.findFromParentURI(c.uri).select("-body").sort("title").exec()
					.then(sublist => c.sublist = sublist))
				)
			)
		)

		// If this page has a sublist, don't display children (they will be displayed in the parent list)
		if (content.has_sublist)
			directory.pop()

		content.directory = directory.filter(list => list.length > 0) // The rest are the directory (assuming they have at least 1 item)

		// Make sure first level is always in a certain order (Diagnosis, Treatment, Help)
		// TODO: This is a bit hacky so maybe there should be another solution
		if (content.directory[0][1].uri === "help") {
			// Swap with treatment
			const tmp = content.directory[0][1]
			content.directory[0][1] = content.directory[0][2]
			content.directory[0][2] = tmp
		}

		// Provide a way for the template to lookup whether a URI is selected
		content.selected = {}
		content.lineage.forEach(uri => content.selected[uri] = "selected")
		// The current page too
		content.selected[content.uri] = "selected"

		// Pass on how many levels there are in this branch
		// TODO: is this being used for anything?
		// And how deep we are into the branch
		content.classes = `directory-browser levels-${content.directory.length} deepness-${content.lineage.length}`
	}

	// Render page

	// Editor URI
	content.edit_uri = "/dashboard/directory/" + content.uri

	// Handlebar local helper
	content.helpers = {
		// TODO: Move this into a separate handler
		shift_headers: (offset, text) => {
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
})

module.exports = router
