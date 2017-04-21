import mongoose from "mongoose"
import Content  from "./content"

const schema = new mongoose.Schema({
	uri:        {type: String, unique: true, required:true},
	name:       String,
	youtube_id: String,
	titles:     String,
}, {
	timestamps: true,
})

schema.statics = {
	findFromURIs(uris) {
		return this
			.find()
			.where("uri").in(uris)
	},
}

schema.virtual('youtube_ids')
	.get(function() {
		return this.youtube_id.split(',')
	})

schema.pre("save", function(next) {
	// Force the URI into acceptable format:
	this.uri = Content.normalizeURI(this.uri)

	next()
})

export default mongoose.model("Video", schema)
