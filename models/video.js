import mongoose from "mongoose"
import Content  from "./content"

const schema = new mongoose.Schema({
	uri:          {type: String, unique: true, minlength:1, required:true},
	youtube_id:   {type: String, required:true},
	name:         {type: String},
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

schema.pre("save", function(next) {
	// Force the URI into acceptable format:
	this.uri = Content.normalizeURI(this.uri)

	next()
})

export default mongoose.model("Video", schema)
