import {expect} from "chai";
import Image  from "../models/image.js";

describe("Image", () => {
	it("should be invalid if there is no URI", done => {
		const i = new Image();
		i.validate(err => {
			expect(err.errors.uri).to.exist;
			done();
		});
	});
});
