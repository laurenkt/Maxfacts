const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
	uri:        {type: String, unique: true, minlength:1, required:true},
	body:       {type: String},
	parent_uri: {type: String, default: ''},
	title:      {type: String, default: ''}
}, {
	timestamps: true
});

module.exports = mongoose.model('Content', ContentSchema);
