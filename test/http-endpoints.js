import {expect} from "chai";
import request  from "supertest";

describe("HTTP end-points", () => {
	// Some set-up needed so the tests can interact with the server on
	// an HTTP level
	let server;
	
	before(done => server = require("../app.js").listen(3001, done));
	after(done => server.close(done));

	// Set-up done, do the testing
	describe("/", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/")
				.expect(200, done);
		});
	});

	describe("/diagnosis", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/diagnosis")
				.expect(200, done);
		});
	});

	describe("/dashboard", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/diagnosis")
				.expect(200, done);
		});
	});

	it("should 404 /foo/bar", done => {
		request(server)
			.get("/foo/bar")
			.expect(404, done);
	});
});
