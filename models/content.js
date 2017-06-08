// @flow
import mongoose     from "mongoose"
import sanitizeHtml from "sanitize-html"
import {Parser,
	DomHandler}     from "htmlparser2"
import {merge, uniq, map,
	difference}     from "lodash"
import DomUtils     from "domutils"

mongoose.Promise = global.Promise // Required to squash a deprecation warning

const schema = new mongoose.Schema({
	uri: {
		type:      String,
		unique:    true,
		minlength: 1,
		required:  true,
		set: function(uri) {
			// Track the previous URI so that when saved we can update all
			// links to the node with previous URI
			if (uri != this.uri)
				this._previousURI = this.uri
			
			return uri
		},
	},
	id: {
		type: String,
		unique: true,
		set: function(id) {
			this._idChanged = true
			return id
		}
	},
	order:       {type: Number, default: 0},
	body:        {type: String},
	description: {type: String},
	surtitle:    {type: String},
	further_reading_uri:
	             {type: String},
	title:       {type: String,  required:true},
	type:        {type: String,  default: "page"},
	has_sublist: {type: Boolean, default: false},
	contents:    {type: [{text: String, id: String}]},
}, {
	timestamps: true,
})

schema.index({
	body:        "text",
	title:       "text",
	description: "text",
}, {
	weights: {
		title:       10,
		description: 7,
		body:        4,
	},
})

schema.statics = {
	parentUriFragment(uri):string {
		return uri.split("/").slice(0, -1).join("/")
	},

	normalizeURI(uri):string {
		// Force the URI into acceptable format:
		return uri
			// All lowercase
			.toLowerCase()
			// Convert spaces and underscores to dashes (and multiple dashes)
			.replace(/[_ -]+/g, "-")
			// Remove any duplicate slashes
			.replace(/[\/]+/g, "/")
			// Remove any leading or trailing slashes or dashes
			.replace(/(^[\/-]+|[\/-]+$)/g, "")
			// Remove any remaining characters that don"t conform to the URL
			.replace(/[^a-z0-9-\/]+/g, "")
	},

	async getAllURIs():Array<String> {
		const all_uris = await this.find().select('uri').exec()

		// Return just a list of the URI parts, prepended with the root URL
		return all_uris.map(uri => '/' + uri.uri)
	},

	getLinksInHTML(html):Array<String> {
		let links:Array<String> = []
		const parser = new Parser({
			onopentag(name, attribs) {
				if (name == "a" && attribs.href)
					// Track link without leading slash
					links.push(attribs.href.replace(/^\//, ""))
			},
		})
		parser.write(html)
		parser.end()

		return uniq(links)
	},

	getImgSrcsInHTML(html):Array<String> {
		let images:Array<String> = []
		const parser = new Parser({
			onopentag(name, attribs) {
				if (name == "img" && attribs.src)
					// Strip leading slash
					images.push(attribs.src.replace(/^\//, ""))
			},
		})
		parser.write(html)
		parser.end()

		return uniq(images)
	},

	getSanitizedHTML(html:String):String {
		// Force the body into an acceptable format
		// Allow only a super restricted set of tags and attributes
		let reduced_body = ""
		for(;;) {
			reduced_body = sanitizeHtml(html, {
				allowedTags: ["h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "p", "a", "ul", "ol",
					"li", "strong", "em", "table", "thead", "caption", "tbody", "tfoot", "tr", "th", "td",
					"figure", "abbr", "img", "aside", "caption", "cite", "dd", "dfn", "dl", "dt", "figcaption",
					"sub", "sup", "i"],
				allowedAttributes: merge({
					th: ["colspan", "rowspan"],
					td: ["colspan", "rowspan"],
				}, sanitizeHtml.defaults.allowedAttributes),
				exclusiveFilter: frame => {
					// Remove certain empty tags
					return ["p", "a", "em", "strong"].includes(frame.tag) && !frame.text.trim() && !frame.children.length
				},
				textFilter: (text, stack) => {
					// Remove things not in a tag at all
					if (stack.length == 0)
						// If it"s not in a container class
						return text
						// Remove any non-whitespace characters
							.replace(/[^\s]+/g, "")
						// Remove any blank lines
							.replace(/[\n]+/g, "\n") // Unix
							.replace(/(\r\n)+/g, "\r\n") // Windows
					else
						return text
				},
			})

			if (reduced_body == html)
				break

			html = reduced_body
		}

		return html
	},

	getHTMLWithHeadingIDs(html:String) {
		let new_body
		let headings = []

		let handler = new DomHandler((err, dom) => {
			DomUtils.getElements({tag_name:"h1"}, dom, true).forEach(node => {
				let text = DomUtils.getText(node)
				let id = text
					// All lowercase
						.toLowerCase()
					// Make sure ampersands are covered
						.replace(/&amp/g, "and")
					// Convert spaces and underscores to dashes (and multiple dashes)
						.replace(/[_ -]+/g, "-")
					// Remove any duplicate slashes
						.replace(/[\/]+/g, "/")
					// Remove any leading or trailing slashes or dashes
						.replace(/(^[\/-]+|[\/-]+$)/g, "")
					// Remove any remaining characters that don"t conform to the URL
						.replace(/[^a-z0-9-\/]+/g, "")
				
				node.attribs.id = id
				headings.push({text, id})
			})
			new_body = DomUtils.getOuterHTML(dom)
		})
		let parser = new Parser(handler)
		parser.write(html)
		parser.done()

		return {
			html: new_body,
			contents: headings,
		}
	},

	async getAllIdUriPairs() {
		const all_pages = await this.find().select('uri id').exec()

		let uris = []
		let ids  = []

		all_pages.forEach(page => {
			if (page.id && page.id !== "") {
				uris.push("/" + page.uri)
				ids.push("/" + page.id)
			}
		})

		return {ids, uris}
	},

	replaceHREFsWith(html:String, from:Array<String>, to:Array<String>):String {
		let handler = new DomHandler((err, dom) => {
			DomUtils.getElements({tag_name:"a"}, dom, true).forEach(node => {
				if (!node.attribs.href)
					return

				for (let i = 0; i < from.length; i++) {
					if (node.attribs.href == from[i]) {
						node.attribs.href = to[i]
						return // don't bother with any other replacements
					}
				}
			})
			html = DomUtils.getOuterHTML(dom)
		})
		let parser = new Parser(handler)
		parser.write(html)
		parser.done()

		return html
	},

	getLineageFromURI(uri) {
		let fragments = []
		let parent = uri
		while (parent != "") {
			fragments.push(parent)
			parent = this.parentUriFragment(parent)
		}

		return fragments.reverse()
	},

	findBreadcrumbsForURI(uri) {
		return this.findFromURIs(
				this.getLineageFromURI(this.parentUriFragment(uri))
			)
			.select("title uri")
			.sort("uri")
	},

	findFromURIs(uris) {
		return this
			.find()
			.where("uri").in(uris)
	},

	findFromParentURI(parent) {
		return this
			.find()
		// Only match URIs prefixed with the parent without any following slashes
			.where("uri", new RegExp(parent != "" ? `^${parent}/[^/]+$` : "^[^/]+$"))
	},

	findAllBelowURI(uri) {
		return this
			.find()
			.where("uri", new RegExp(`^${uri}/.+$`))
	},

	findFromAdjacentURI(uri) {
		return this.findFromParentURI(this.parentUriFragment(uri))
	},
}

schema
	.virtual("parent")
	.get(function() { return this.constructor.parentUriFragment(this.uri) })

schema
	.virtual("lineage")
	.get(function() { return this.constructor.getLineageFromURI(this.parent) } )

schema.methods = {
	async getInvalidLinks() {
		const links = this.model("Content").getLinksInHTML(this.body)
		const valid_links = await this.model("Content").findFromURIs(links)
			.select("uri")
			.exec()

		return difference(links, map(valid_links, 'uri'))
	},

	// Retrieves an array of images used in this model
	getImages: function () {
		const images = this.model("Content").getImgSrcsInHTML(this.body)

		return this.model("Image")
			.findFromURIs(images)
			.select("_id uri")
			.exec()
	},

	getBreadcrumbs: function() {
		return this.constructor.findBreadcrumbsForURI(this.uri).exec()
	},

	getNextPage: async function() {
		// No next page for level 3
		if (this.type == "level3")
			return

		return (await this.model("Content")
			.find()
			/// The location can be below or adjacent to the current page
			.where("uri", new RegExp(`^(${this.uri}|${this.parent})/[^/]+$`))
			.select("-body")
			.where("title", this.title)
			// Only allow a type that could follow the current type
			.where("type").in(
				this.type == "level1" ? ["level2", "level3"] :
				this.type == "level2" ? ["level3"] :
				["level1", "level2", "level3"])
			// Make sure to favour the order of the types
			.sort("type")
			// Only need one of them
			.limit(1)
			.exec())[0]
	},

	setIDsForHeadings: function() {
		const heading_data = this.model("Content").getHTMLWithHeadingIDs(this.body)

		this.body     = heading_data.html
		this.contents = heading_data.contents
	},

	replaceHREFsWith: function(from:Array<String>, to:Array<String>) {
		this.body = this.model("Content").replaceHREFsWith(this.body, from, to)
	},
}

schema.pre("save", async function(next) {
	// Force the URIs into acceptable format:
	this.uri = this.model("Content").normalizeURI(this.uri)

	if (this.further_reading_uri)
		this.further_reading_uri = this.model("Content").normalizeURI(this.further_reading_uri)

	// Update any links to IDs in the body
	let {ids, uris} = await this.model("Content").getAllIdUriPairs()
	this.replaceHREFsWith(ids, uris)

	// Force the body into an acceptable format
	// Allow only a super restricted set of tags and attributes
	this.body = this.model("Content").getSanitizedHTML(this.body)

	// Generate table of contents from <h1> tags
	// And update IDs of header elements to match text
	this.setIDsForHeadings()

	// Save it
	next()
})

schema.post("save", async function(content) {

	// Need to replace any pages that use ID or old URI if there is one
	const has_new_uri = content._previousURI && content._previousURI != content.uri

	let find = []
	let replace = ['/' + content.uri, '/' + content.uri]

	if (content._idChanged && content.id !== "")
		find.push('/' + content.id)

	if (has_new_uri)
		find.push('/' + content._previousURI)

	if (find.length > 0) {
		// It was updated
		// Update links in text
		const matches = await content.model("Content")
			.find({ 
				body: { $regex : `(${find.join('|')})` },
				uri:  { $ne: content.uri },
			})
			.exec()

		matches.forEach(page => {
			page.replaceHREFsWith(find, replace)
			return page.save()
		})

		// And update child URIs that contain the parent URI
		const pages = await content.model("Content").findAllBelowURI(content._previousURI).exec()
		pages.forEach(async page => {
			page.uri = page.uri.replace(content._previousURI, content.uri)
			await page.save()
		})
	}
})

export default mongoose.model("Content", schema)
