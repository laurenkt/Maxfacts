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

	describe(".findLinksInHTML", () => {
		it("should find all links in a block of HTML", () => {
			const html = `
				<p>A <a href="/1">B</a> C</p>
				<a
					href="/D"
				>
				2
				</a>
				<A Href="/e">f</a>
				<div>
					<a title="g" href="h" id="i" />
				</div>
			`;

			const result = Content.findLinksInHTML(html);
			const links = [
				"1",
				"D",
				"e",
				"h"
			];

			expect(result).to.have.members(links);
		});

		it("should only find unique links", () => {
			const html = `
				<a href="/1">A</a>
				<a href="/1">A</a>
				<a href="1">A</a>
			`;

			const result = Content.findLinksInHTML(html);
			const links = [
				"1",
			];

			expect(result).to.have.members(links);
		});
	});

	describe(".findImgSrcsInHTML", () => {
		it("should find all image src's in a block of HTML", () => {
			const html = `
				<img src="/a" />
				<IMG SRC="/b" />
				<img
					src="c">
				<figure>
					<img src="d">
				</figure>
			`;

			const result = Content.findImgSrcsInHTML(html);
			const srcs   = [
				"a",
				"b",
				"c",
				"d"
			];

			expect(result).to.have.members(srcs);
		});

		it("should only find unique image src's", () => {
			const html = `
				<img src="a" />
				<img src="/a" />
				<img src="a" />
			`;

			const result = Content.findImgSrcsInHTML(html);
			const srcs   = [
				"a",
			];

			expect(result).to.have.members(srcs);
		});
	});

	describe(".parentUriFragment", () => {
		it("should be able to determine the parent URI fragment", () => {
			const uut = Content.parentUriFragment;

			expect( uut("a/b/c") ).to.equal("a/b");
			expect( uut("a/b")   ).to.equal("a");
			expect( uut("a/b/c") ).to.equal("a/b");
			expect( uut("a")     ).to.equal("");
		});
	});

	describe(".normalizeURI", () => {
		it("should normalize URIs correctly", () => {
			const uut = Content.normalizeURI;

			expect (uut("/a/b/c"))    .to.equal("a/b/c");
			expect (uut("a/B/c"))     .to.equal("a/b/c");
			expect (uut("a//b//c"))   .to.equal("a/b/c");
			expect (uut("a!//b$(/c")) .to.equal("a/b/c");
			expect (uut("a/b/c d/"))  .to.equal("a/b/c-d");
			expect (uut("a"))         .to.equal("a");
			expect (uut("/a"))        .to.equal("a");
			expect (uut("////a"))     .to.equal("a");
			expect (uut("// / // a")) .to.equal("a");
			expect (uut(" a "))       .to.equal("a");
			expect (uut("a b c"))     .to.equal("a-b-c");
		});
	});
});
