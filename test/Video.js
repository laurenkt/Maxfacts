import {expect} from "chai"
import Video    from "../models/video.js"

describe("Video", () => {
	it("should be invalid if there is no URI", done => {
		const v = new Video()
		v.validate(err => {
			expect(err.errors.uri).to.exist
			done()
		})
	})

	it("should be invalid if there is no YouTube ID", done => {
		const v = new Video()
		v.validate(err => {
			expect(err.errors.youtube_id).to.exist
			done()
		})
	})

})
