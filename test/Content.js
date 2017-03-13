import {expect} from "chai"
import Content  from "../models/content.js"

describe("Content", () => {
	it("should be invalid if there is no URI", done => {
		const c = new Content()
		c.validate(err => {
			expect(err.errors.uri).to.exist
			done()
		})
	})

	it("should be invalid if there is no title", done => {
		const c = new Content()
		c.validate(err => {
			expect(err.errors.title).to.exist
			done()
		})
	})

	describe(".getLinksInHTML", () => {
		it("should get all links in a block of HTML", () => {
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
			`

			const result = Content.getLinksInHTML(html)
			const links = [
				"1",
				"D",
				"e",
				"h",
			]

			expect(result).to.have.members(links)
		})

		it("should only get unique links", () => {
			const html = `
				<a href="/1">A</a>
				<a href="/1">A</a>
				<a href="1">A</a>
			`

			const result = Content.getLinksInHTML(html)
			const links = [
				"1",
			]

			expect(result).to.have.members(links)
		})
	})

	describe(".getImgSrcsInHTML", () => {
		it("should get all image src's in a block of HTML", () => {
			const html = `
				<img src="/a" />
				<IMG SRC="/b" />
				<img
					src="c">
				<figure>
					<img src="d">
				</figure>
			`

			const result = Content.getImgSrcsInHTML(html)
			const srcs   = [
				"a",
				"b",
				"c",
				"d",
			]

			expect(result).to.have.members(srcs)
		})

		it("should only get unique image src's", () => {
			const html = `
				<img src="a" />
				<img src="/a" />
				<img src="a" />
			`

			const result = Content.getImgSrcsInHTML(html)
			const srcs   = [
				"a",
			]

			expect(result).to.have.members(srcs)
		})
	})

	describe(".getHTMLWithHeadingIDs", () => {
		it("should insert appropriate IDs into headings", () => {
			const html = "<h1>Test</h1><h2>Test_2</h2><h1>Another test</h1>"
			const expected = "<h1 id=\"test\">Test</h1><h2>Test_2</h2><h1 id=\"another-test\">Another test</h1>"

			const result = Content.getHTMLWithHeadingIDs(html).html

			expect(result).to.equal(expected)
		})

		it("should generate correct table of contents", () => {
			const html = "<h1>Test</h1><h2>Test_2</h2><h1>Another test</h1>"
			const expected = [
				{"text": "Test", "id": "test"},
				{"text": "Another test", "id": "another-test"},
			]

			const result = Content.getHTMLWithHeadingIDs(html).contents

			expect(result).to.deep.equal(expected)
		})
	})

	describe(".getSanitizedHTML", () => {
		it("should strip invalid tags", () => {
			const html = "<p>A</p><center>B</center><footer /><header /><main /><section /><div /><body /><head /><script /><style />"
			const expected = "<p>A</p>"

			const result = Content.getSanitizedHTML(html)

			expect(result).to.equal(expected)
		})

		it("should strip invalid attributes", () => {
			const html = "<p onClick='alert(0)' onLoad='alert(0)' style='color:red' data-attribs='anything'>A</p>"
			const expected = "<p>A</p>"

			const result = Content.getSanitizedHTML(html)

			expect(result).to.equal(expected)
		})

		it("should retain valid tags", () => {
			const html = `
				<h1>Test</h1>
				<h2>Test</h2>
				<h3>Test</h3>
				<h4>Test</h4>
				<h5>Test</h5>
				<h6>Test</h6>
				<p>Test</p>
				<img src />
				<aside>Test</aside>
				<i>Test</i>
				<strong>Test</strong>
				<em>Test</em>
				<figure>
					<img src />
					<figcaption>Test</figcaption>
				</figure>
				<table>
					<tr>
						<td></td>
					</tr>
				</table>
				<ol>
					<li>Test</li>
				</ol>
				<ul>
					<li>Test</li>
				</ul>
				<sub>Test</sub>
				<sup>Test</sup>
			`

			const result = Content.getSanitizedHTML(html)

			expect(result).to.equal(html)
		})
	})

	describe(".replaceHREFsWith", () => {
		it("should find and replace a given URL", () => {
			const html = '<a href="/foo"></a>'
			const expected = '<a href="/bar"></a>'

			const result = Content.replaceHREFsWith(html, "/foo", "/bar")

			expect(result).to.equal(expected)
		})
	})

	describe(".parentUriFragment", () => {
		it("should be able to determine the parent URI fragment", () => {
			const uut = Content.parentUriFragment

			expect( uut("a/b/c") ).to.equal("a/b")
			expect( uut("a/b")   ).to.equal("a")
			expect( uut("a/b/c") ).to.equal("a/b")
			expect( uut("a")     ).to.equal("")
		})
	})

	describe(".normalizeURI", () => {
		it("should normalize URIs correctly", () => {
			const uut = Content.normalizeURI

			expect (uut("/a/b/c"))    .to.equal("a/b/c")
			expect (uut("a/B/c"))     .to.equal("a/b/c")
			expect (uut("a//b//c"))   .to.equal("a/b/c")
			expect (uut("a!//b$(/c")) .to.equal("a/b/c")
			expect (uut("a/b/c d/"))  .to.equal("a/b/c-d")
			expect (uut("a"))         .to.equal("a")
			expect (uut("/a"))        .to.equal("a")
			expect (uut("////a"))     .to.equal("a")
			expect (uut("// / // a")) .to.equal("a")
			expect (uut(" a "))       .to.equal("a")
			expect (uut("a b c"))     .to.equal("a-b-c")
		})
	})
})
