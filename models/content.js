import mongoose     from 'mongoose';
import sanitizeHtml from 'sanitize-html';
import {Parser}     from 'htmlparser2';
import {merge, uniq, map,
	difference}     from 'lodash';

const ContentSchema = new mongoose.Schema({
	uri:        {type: String, unique: true, minlength:1, required:true},
	body:       {type: String},
	title:      {type: String, default: ''}
}, {
	timestamps: true
});

ContentSchema.statics = {
	parentUriFragment: uri => uri.split('/').slice(0, -1).join('/'),

	findFromURIs(uris) {
		return this
			.find()
			.where('uri').in(uris);
	}
};

ContentSchema
	.virtual('parent')
	.get(function() { return ContentSchema.statics.parentUriFragment(this.uri); });

ContentSchema
	.virtual('lineage')
	.get(function() {
		var fragments = [];
		var parent = this.parent;
		while (parent != '') {
			fragments.push(parent);
			parent = ContentSchema.statics.parentUriFragment(parent);
		}

		return fragments.reverse();
	});

ContentSchema.methods = {
	getInvalidLinks: function() {
		var links = [];
		var parser = new Parser({
			onopentag(name, attribs) {
				if (name == 'a' && attribs.href)
					// Track link without leading slash
					links.push(attribs.href.replace(/^\//, ''));
			}
		});
		parser.write(this.body);
		parser.end();

		links = uniq(links);

		return this.model('Content')
			.findFromURIs(links)
			.select('uri')
			.exec()
			.then(valid_links => difference(links, map(valid_links, 'uri')));
	}
};

ContentSchema.pre('save', function(next) {
	// Force the URI into acceptable format:
	this.uri = this.uri
	// All lowercase
		.toLowerCase()
	// Convert spaces and underscores to dashes (and multiple dashes)
		.replace(/[_ -]+/g, '-')
	// Remove any duplicate slashes
		.replace(/[\/]+/g, '/')
	// Remove any leading or trailing slashes or dashes
		.replace(/(^[\/-]+|[\/-]+$)/g, '')
	// Remove any remaining characters that don't conform to the URL
		.replace(/[^a-z0-9-\/]+/g, '');

	// Force the body into an acceptable format
	// Allow only a super restricted set of tags and attributes
	var reduced_body = '';
	while(1) {
		reduced_body = sanitizeHtml(this.body, {
			allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
				'li', 'strong', 'em', 'table', 'thead', 'caption', 'tbody', 'tfoot', 'tr', 'th', 'td',
				'figure', 'abbr', 'img', 'caption', 'cite', 'dd', 'dfn', 'dl', 'dt', 'figcaption',
				'sub', 'sup'],
			allowedAttributes: merge({
				th: ['colspan', 'rowspan'],
				td: ['colspan', 'rowspan']
			}, sanitizeHtml.defaults.allowedAttributes),
			exclusiveFilter: frame => {
				// Remove certain empty tags
				return ['p', 'a', 'em', 'strong'].includes(frame.tag) && !frame.text.trim() && !frame.children.length;
			},
			textFilter: (text, stack) => {
				// Remove things not in a tag at all
				if (stack.length == 0)
					// If it's not in a container class
					return text
					// Remove any non-whitespace characters
						.replace(/[^\s]+/g, '')
					// Remove any blank lines
						.replace(/[\n]+/g, "\n") // Unix
						.replace(/(\r\n)+/g, "\r\n"); // Windows
					else
						return text;
			}
		});

		if (reduced_body == this.body)
			break;

		this.body = reduced_body;
	}

	// Save it
	next();
});



module.exports = mongoose.model('Content', ContentSchema);
