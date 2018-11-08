import {expect} from "chai"
import Image  from "../models/image.js"

describe("Image", () => {
	it("should be invalid if there is no URI", done => {
		const i = new Image()
		i.validate(err => {
			expect(err.errors.uri).to.exist
			done()
		})
	})

	it("should be invalid if MIME type is forbidden", done => {
		const i = new Image()
		i.mimetype = "application/javascript"
		i.validate(err => {
			expect(err.errors.mimetype).to.exist
			done()
		})
	})

	it("should allow JPEG MIME type", done => {
		const i = new Image()
		i.mimetype = "image/jpeg"
		i.validate(err => {
			expect(err.errors.mimetype).to.not.exist
			done()
		})
	})

	it("should allow PNG MIME type", done => {
		const i = new Image()
		i.mimetype = "image/png"
		i.validate(err => {
			expect(err.errors.mimetype).to.not.exist
			done()
		})
	})

	it("should allow PDF MIME type", done => {
		const i = new Image()
		i.mimetype = "application/pdf"
		i.validate(err => {
			expect(err.errors.mimetype).to.not.exist
			done()
		})
	})

	describe("::normalizeURI", () => {
		it("should replace extension with correct one", () => {
			const uri = "test.jpg"
			const mimetype = "image/png"
			const expected = "test.png"

			expect(Image.normalizeURI(uri, mimetype)).to.equal(expected)
		})

		it("should add the correct extension when one is not provided", () => {
			const uri = "test"
			const mimetype = "image/jpeg"
			const expected = "test.jpg"

			expect(Image.normalizeURI(uri, mimetype)).to.equal(expected)
		})
	})
})
