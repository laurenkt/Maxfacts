const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
	uri:        {type: String, unique: true, minlength:1, required:true},
	body:       {type: String},
	title:      {type: String, default: ''}
}, {
	timestamps: true
});

ContentSchema.statics.parentUriFragment = uri => uri.split('/').slice(0, -1).join('/');

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

ContentSchema.pre('save', function(next) {
	// Force the URI into acceptable format:
	// All lowercase
	this.uri = this.uri.toLowerCase();
	// Convert spaces and underscores to dashes (and multiple dashes)
	this.uri = this.uri.replace(/[_ -]+/g, '-');
	// Remove any duplicate slashes
	this.uri = this.uri.replace(/[\/]+/g, '/');
	// Remove any leading or trailing slashes or dashes
	this.uri = this.uri.replace(/(^[\/-]+|[\/-]+$)/g, '');
	// Remove any remaining characters that don't conform to the URL
	this.uri = this.uri.replace(/[^a-z0-9-\/]+/g, '');
	// Save it
	next();
});

module.exports = mongoose.model('Content', ContentSchema);
