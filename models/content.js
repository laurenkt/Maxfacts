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

module.exports = mongoose.model('Content', ContentSchema);
