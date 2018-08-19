// @flow
import mongoose     from 'mongoose'
import sanitizeHtml from 'sanitize-html'
import {Parser,
	DomHandler}     from 'htmlparser2'
import {mergeWith,
	uniq,
	map,
	difference}     from 'lodash'
import Video        from './video.js'
import Image        from './image.js'
import DomUtils     from 'domutils'
import XXHash       from 'xxhash'

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
	redirect_uri:{type: String},
	hide:        {type: Boolean, default: false},
	further_reading_uri:
	             {type: String},
	title:       {type: String,  required:true},
	type:        {type: String,  default: "page"},
	has_sublist: {type: Boolean, default: false},
	authorship:  {
		type: String,
		get:  str =>   typeof str === 'string' ? str.split(/[:space:]*;[:space:]*/) : str,
		set:  input => input.join !== undefined ? input.join(';') : input,
	},
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

	async getAllURIs():Promise<Array<string>> {
		const all_uris = await this.find().select('uri').exec()

		// Return just a list of the URI parts, prepended with the root URL
		return all_uris.map(uri => '/' + uri.uri)
	},

	getLinksInHTML(html):Array<string> {
		let links:Array<String> = []
		const parser = new Parser({
			onopentag(name, attribs) {
				if (name == "a" && attribs.href)
					// Track link without leading slash
					links.push(attribs.href)
			},
		})
		parser.write(html)
		parser.end()

		return uniq(links)
	},

	getImgSrcsInHTML(html):Array<string> {
		let images:Array<string> = []
		const parser = new Parser({
			onopentag(name, attribs) {
				if (name == "img" && attribs.src)
					// Strip leading slash
					images.push(attribs.src)
			},
		})
		parser.write(html)
		parser.end()

		return uniq(images)
	},

	getSanitizedHTML(html:string):string {
		// Force the body into an acceptable format
		// Allow only a super restricted set of tags and attributes
		let reduced_body = ""
		for(;;) {
			reduced_body = sanitizeHtml(html, {
				allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
					'li', 'strong', 'em', 'table', 'thead', 'caption', 'tbody', 'tfoot', 'tr', 'th', 'td',
					'figure', 'abbr', 'img', 'aside', 'caption', 'cite', 'dd', 'dfn', 'dl', 'dt', 'figcaption',
					'sub', 'sup', 'i', 'br', 'hr', 'video', 'source'],
				allowedAttributes: mergeWith({
					th: ['colspan', 'rowspan'],
					td: ['colspan', 'rowspan'],
					a: ['class'],
					img: ['width', 'height'],
					video: ['src', 'controls'],
					source: ['src'],
				}, sanitizeHtml.defaults.allowedAttributes, (objValue, srcValue) => {
					if (Array.isArray(objValue) && Array.isArray(srcValue))
						return srcValue.concat(objValue)
				}),
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

	getHTMLWithHeadingIDs(html:string) {
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

				if (!node.attribs)
					node.attribs = {}

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

	async getAllIdUriPairs():Promise<{uris: Array<string>, ids: Array<string>}> {
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

	findWithNoAuthorship() {
		return this
			.find({ $or: [{authorship: {$exists: false}}, {authorship: ''}] })
			.where('type')
			.in(['level1', 'level2', 'level3', 'page'])
			.where('body')
			.ne('')
	},

	replaceHREFsWith(html:string, from:Array<string>, to:Array<string>):string {
		let handler = new DomHandler((err, dom) => {
			DomUtils.getElements({tag_name:"a"}, dom, true).forEach(node => {
				if (!node.attribs || !node.attribs.href)
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
			.where("uri").in(uris.map(uri => uri.replace(/^\//, '')))
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

	etagFromBuffer(buffer:Buffer|string, seed:number):string {
		if (typeof buffer !== 'Buffer')
			buffer = Buffer.from(buffer)

		return XXHash.hash64(
			buffer,
			// Convert to 32-bit int for hash
			seed >>> 0,
			// Hex output easily readable
			'hex'
		)
	},
}

schema
	.virtual("parent")
	.get(function() { return this.constructor.parentUriFragment(this.uri) })

schema
	.virtual("lineage")
	.get(function() { return this.constructor.getLineageFromURI(this.parent) } )

schema.methods = {
	getLinksInHTML() {
		return this.model('Content').getLinksInHTML(this.body)
	},

	getMatchedParagraph(regexp:RegExp) {
		let elements:Array<any> = []

		let handler = new DomHandler((err, dom) => {
			elements =
				DomUtils.getElements({tag_name:'p'}, dom, true).concat(
					DomUtils.getElements({tag_name:'li'}, dom, true),
					DomUtils.getElements({tag_name:'td'}, dom, true),
					DomUtils.getElements({tag_name:'h1'}, dom, true),
					DomUtils.getElements({tag_name:'h2'}, dom, true),
					DomUtils.getElements({tag_name:'h3'}, dom, true),
					DomUtils.getElements({tag_name:'h4'}, dom, true),
					DomUtils.getElements({tag_name:'h5'}, dom, true),
				)
		})
		let parser = new Parser(handler, {decodeEntities:true})
		parser.write(this.body)
		parser.done()

		for (let i = 0; i < elements.length; i++) {
			let match = DomUtils.getText(elements[i]).match(regexp)
			if (match != null)
				return match
		}

		return null
	},

	async getInvalidLinks() {
		const links = this.model("Content").getLinksInHTML(this.body)
			.filter(link => !link.match(/^([A-Za-z]+:)?\/\//)) // Filter external URLs
			.filter(link => !link.match(/\/feedback$/i)) // Filter feedback links
		const valid_pages = await this.model("Content").findFromURIs(links).select("uri").exec()
		const valid_videos = await Video.findFromURIs(links).select("uri").exec()
		const valid_images = await Image.findFromURIs(links).select("uri").exec()

		const valid_links = valid_pages.concat(valid_videos).concat(valid_images)// join them

		return difference(links, valid_links.map(content => '/' + content.uri))
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

	async getChildren() {
		return this.model('Content').findFromParentURI(this.uri).exec()
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
