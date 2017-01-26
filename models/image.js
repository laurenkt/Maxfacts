const mongoose     = require("mongoose");

const ImageSchema = new mongoose.Schema({
	uri:          {type: String, unique: true, minlength:1, required:true},
	originalname: {type: String},
	buffer:       {type: Buffer},
	encoding:     {type: String},
	mimetype:     {type: String},
	size:         {type: Number},
}, {
	timestamps: true,
});

ImageSchema.statics = {
	findFromURIs(uris) {
		return this
			.find()
			.where("uri").in(uris);
	},
};

ImageSchema.pre("save", function(next) {
	const mimetypes = {
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"application/pdf": ".pdf",
	};

	// Validation
	if (!mimetypes.hasOwnProperty(this.mimetype)) {
		next(new Error(`Forbidden mime-type: ${this.mimetype}`));
	}

	// Force the URI into acceptable format:
	this.uri = this.uri
		// All lowercase
		.toLowerCase()
		// Remove the last fragment after a period
		.replace(/(.*)(\..*)/g, "$1")
		// Convert spaces and underscores to dashes (and multiple dashes)
		.replace(/[_ -]+/g, "-")
		// Remove any duplicate slashes
		.replace(/[\/]+/g, "/")
		// Remove any leading or trailing slashes or dashes
		.replace(/(^[\/-]+|[\/-]+$)/g, "")
		// Remove any remaining characters that don"t conform to the URL
		.replace(/[^a-z0-9-\/]+/g, "")
		// Append file extension
		.concat(mimetypes[this.mimetype]);

	next();
});

module.exports = mongoose.model("Image", ImageSchema);
