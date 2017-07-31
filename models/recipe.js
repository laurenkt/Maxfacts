import mongoose from "mongoose"

const schema = new mongoose.Schema({
	id: {
		type:     String,
		unique:   true,
		required: true
	},
	title:        String,
	tags:         [String],
	description:  [String],
	ingredients:  [String],
	method:       [String],
	variations:   [String],
	tip:          [String],
}, {
	timestamps:   true,
})

export default mongoose.model('Recipe', schema)
