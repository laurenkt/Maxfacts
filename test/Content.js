import {expect} from "chai";
import Content  from "../models/content.js";

describe("Content", () => {
	it("should be invalid if there is no URI", done => {
		const c = new Content();
		c.validate(err => {
			expect(err.errors.uri).to.exist;
			done();
		});
	});
	it("should be invalid if there is no title", done => {
		const c = new Content();
		c.validate(err => {
			expect(err.errors.title).to.exist;
			done();
		});
	});
});
