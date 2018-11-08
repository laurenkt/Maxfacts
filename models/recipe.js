import mongoose from "mongoose"

const schema = new mongoose.Schema({
	id: {
		type:     String,
		unique:   true,
		required: true
	},
	title:        String,
	tags:         [String],
	description:  mongoose.Schema.Types.Mixed,
	ingredients:  mongoose.Schema.Types.Mixed,
	method:       mongoose.Schema.Types.Mixed,
	variations:   mongoose.Schema.Types.Mixed,
	tip:          mongoose.Schema.Types.Mixed,
}, {
	timestamps:   true,
})

export default mongoose.model('Recipe', schema)
