// @flow
import mongoose     from "mongoose"
import sanitizeHtml from "sanitize-html"
import {Parser,
	DomHandler}     from "htmlparser2"
import {merge, uniq, map,
	difference}     from "lodash"
import DomUtils     from "domutils"

mongoose.Promise = global.Promise // Required to squash a deprecation warning

const ContentSchema = new mongoose.Schema({
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

ContentSchema.index({
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

ContentSchema.statics = {
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

	getAllURIs():Promise<Array<String>> {
		return this
			.find()
			.select("uri")
			.exec()
			.then(uris => uris.map(uri => '/' + uri.uri)) // Extract just the URI
	},

	findLinksInHTML(html):Array<String> {
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

	findImgSrcsInHTML(html):Array<String> {
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
			.where("uri", new RegExp(`^${uri}.+$`))
	},

	findFromAdjacentURI(uri) {
		return this.findFromParentURI(this.parentUriFragment(uri))
	},
}

ContentSchema
	.virtual("parent")
	.get(function() { return ContentSchema.statics.parentUriFragment(this.uri) })

ContentSchema
	.virtual("lineage")
	.get(function() {
		let fragments = []
		let parent = this.parent
		while (parent != "") {
			fragments.push(parent)
			parent = ContentSchema.statics.parentUriFragment(parent)
		}

		return fragments.reverse()
	})

ContentSchema.methods = {
	getInvalidLinks: function() {
		const links = this.model("Content").findLinksInHTML(this.body)

		return this.model("Content")
			.findFromURIs(links)
			.select("uri")
			.exec()
			.then(valid_links => difference(links, map(valid_links, "uri")))
	},

	// Retrieves an array of images used in this model
	getImages: function () {
		const images = this.model("Content").findImgSrcsInHTML(this.body)

		return this.model("Image")
			.findFromURIs(images)
			.select("_id uri")
			.exec()
	},

	getBreadcrumbs: function() {
		return this.model("Content").findFromURIs(this.lineage)
			.select("title uri")
			.sort("uri")
			.exec()
	},

	getNextPage: function() {
		return this.model("Content")
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
			.exec()
			.then(next_page => next_page[0])
	},

	setIDsForHeadings: function() {
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
		parser.write(this.body)
		parser.done()

		this.body = new_body
		this.contents = headings
	},

	replaceHREFsWith: function(from, to) {
		let handler = new DomHandler((err, dom) => {
			DomUtils.getElements({tag_name:"a"}, dom, true).forEach(node => {
				if (node.attribs.href && node.attribs.href == from) {
					// Update HREF
					node.attribs.href = to
				}
			})
			this.body = DomUtils.getOuterHTML(dom)
		})
		let parser = new Parser(handler)
		parser.write(this.body)
		parser.done()
	},
}

ContentSchema.pre("save", function(next) {
	// Force the URIs into acceptable format:
	this.uri = this.model("Content").normalizeURI(this.uri);
	this.further_reading_uri = this.model("Content").normalizeURI(this.further_reading_uri);

	// Force the body into an acceptable format
	// Allow only a super restricted set of tags and attributes
	let reduced_body = ""
	for(;;) {
		reduced_body = sanitizeHtml(this.body, {
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

		if (reduced_body == this.body)
			break

		this.body = reduced_body
	}

	// Generate table of contents from <h1> tags
	// And update IDs of header elements to match text
	this.setIDsForHeadings()

	// Save it
	next()
})

ContentSchema.post("save", function(content) {
	const updateHREFs = page => {
		page.replaceHREFsWith("/" + content._previousURI, "/" + content.uri)
		return page.save()
	}

	// Need to update any other content if the URI changed
	if (content._previousURI && content._previousURI != content.uri) {
		// It was updated
		// Update links in text
		content.model("Content")
			.find({ $text : { $search : content._previousURI } })
			.exec()
			.then(matches => Promise.all(matches.map(updateHREFs)))
			.catch(console.error.bind(console))

		// And update child URIs that contain the parent URI
		content.model("Content").findAllBelowURI(content._previousURI)
			.exec()
			.then(pages => Promise.all(pages.map(page => {
				page.uri = page.uri.replace(content._previousURI, content.uri)
				return page.save()
			})))
			.catch(console.error.bind(console))
	}
})

export default mongoose.model("Content", ContentSchema)
