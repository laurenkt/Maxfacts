import mongoose from "mongoose"

const mimetypes = {
	"image/jpeg": ".jpg",
	"image/png": ".png",
	"application/pdf": ".pdf",
}

const ImageSchema = new mongoose.Schema({
	uri: { type: String, unique: true, minlength: 1, required: true },
	originalname: { type: String },
	buffer: { type: Buffer },
	encoding: { type: String },
	mimetype: { type: String, validate: str => mimetypes.hasOwnProperty(str) },
	size: { type: Number },
}, {
		timestamps: true,
	})

ImageSchema.statics = {
	findFromURIs(uris) {
		return this
			.find()
			.where("uri").in(uris.map(uri => uri.replace(/^\//, '')))
	},

	normalizeURI(uri, type) {
		return uri
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
			.concat(mimetypes[type])
	},
}

ImageSchema.pre("save", function (next) {
	// Force the URI into acceptable format:
	this.uri = this.model("Image").normalizeURI(this.uri, this.mimetype)

	next()
})

export default mongoose.model("Image", ImageSchema)
