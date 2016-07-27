const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
	uri:  {type: String, unique: true},
	body: {type: String}
});

module.exports = mongoose.model('Content', ContentSchema);
