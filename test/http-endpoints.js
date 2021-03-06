import request from "supertest"

describe("HTTP end-point integrations", function() {
	// Some set-up needed so the tests can interact with the server on
	// an HTTP level
	this.timeout(15000)
	let server = `http://${process.env.HOSTNAME || 'localhost'}:3000`
	console.log(`Running integrations against URL "${server}"`)
	
	//before(done => server = require("../app.js").listen(3001, done))
	//after(done => server.close(done))

	// Set-up done, do the testing
	describe("/", () => {
		it("should respond to localhost GET", done => {
			request("http://localhost:3000")
				.get("/")
				.expect(200, done)
		})
		it("should respond to 127.0.0.1 GET", done => {
			request("http://127.0.0.1:3000")
				.get("/")
				.expect(200, done)
		})
	})
	describe("/", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/")
				.expect(200, done)
		})
	})

	describe("/css/style.css", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/css/style.css")
				.expect(200, done)
		})
	})

	describe("/js/multipart-player.js", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/js/multipart-player.js")
				.expect(200, done)
		})
	})

	describe("/js/recipe-browser.js", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/js/recipe-browser.js")
				.expect(200, done)
		})
	})

	describe("/js/editor.js", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/js/editor.js")
				.expect(200, done)
		})
	})

	describe("/js/magic-triangle.js", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/js/magic-triangle.js")
				.expect(200, done)
		})
	})

	describe("/magic-triangle", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/magic-triangle")
				.expect(200, done)
		})
	})

	describe("/search?query=test", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/search?query=test")
				.expect(200, done)
		})
	})

	describe("/diagnosis", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/diagnosis")
				.expect(200, done)
		})
	})

	describe("/help/physiotherapy/videos/shoulder", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/help/physiotherapy/videos/shoulder")
				.expect(200, done)
		})
	})

	describe("/help/oral-food/cooking-videos/gelatin", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/help/oral-food/cooking-videos/gelatin")
				.expect(200, done)
		})
	})

	describe("/help/oral-food/recipes/apple-sauce-ice-cream", () => {
		it("should respond to GET", done => {
			request(server)
				.get("/help/oral-food/recipes/apple-sauce-ice-cream")
				.expect(200, done)
		})
	})

	/* TODO find a way to test this in docker container
	 *
	describe("/diagnosis/diagnoses/mouth-cancer/level1/figure1.jpg", () => {

		it("should respond to GET", done => {
			request(server)
				.get("/diagnosis/diagnoses/mouth-cancer/level1/figure1.jpg")
				.expect(200, done)
		})
	})*/

	describe("/dashboard", () => {
		it("should 302 redirect a GET", done => {
			request(server)
				.get("/dashboard")
				.expect(302, done)
		})
	})

	it("should 404 /foo/bar", done => {
		request(server)
			.get("/foo/bar")
			.expect(404, done)
	})
})
