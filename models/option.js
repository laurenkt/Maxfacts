import mongoose from "mongoose"

const schema = new mongoose.Schema({
	key:   {type: String, unique: true, required: true},
	value: {type: String, required: true}
})

schema.statics = {
	async all() {
		const options = await this.find().exec()
		let map = {}

		for (let i = 0; i < options.length; i++) {
			map[options[i].key] = options[i].value
		}

		return map
	},

	async get(key) {
		return (await this.findOne({key}).exec()).value
	},

	async set(key, value) {
		let option = await this.findOne({key}).exec()

		if (!option) {
			option = new this()
			option.key = key
		}

		option.value = value
		await option.save()
	},
}

export default mongoose.model("Option", schema)
