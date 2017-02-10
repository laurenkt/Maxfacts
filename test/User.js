import {expect} from "chai";
import User  from "../models/user.js";

describe("User", () => {
	it("should be invalid if there is no email", done => {
		const u = new User();
		u.validate(err => {
			expect(err.errors.email).to.exist;
			done();
		});
	});
});
