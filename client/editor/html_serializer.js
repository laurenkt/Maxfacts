import React from "react"
import {Html} from "slate"
import {html as html_beautify} from "js-beautify"
import html_clean from "htmlclean"

const BLOCK_TAGS = {
	p:  "paragraph",
	li: "list-item",
	caption: "caption",
	ul: "list",
	ol: "num-list",
	h1: "heading-1",
	h2: "heading-2",
	h3: "heading-3",
	h4: "heading-4",
	h5: "heading-5",
	h6: "heading-6",
	img: "img",
	hr: "hr",
	tr: "tr",
	td: "td",
	th: "th",
	tbody: "tbody",
	table: "table",
	aside: "aside",
}

// Add a dictionary of mark tags.
const MARK_TAGS = {
	strong: "bold",
	em:     "emphasis",
	i:      "italic",
	sub:    "sub",
	sup:    "sup",
}

const colspan = data => {
	if (data.get("attribs").colspan)
		return {colSpan: data.get("attribs").colspan}

	return {}
}

const rules = [
	{
		deserialize(el, _) {
			// Skip certain tags
			switch (el.tagName) {
				case "HEAD":
				case "STYLE":
					return []
				case "O:P":
					// Strip empty paragraphs
					if (el.childNodes.length == 0 || el.childNodes.every(child => child.type == "text" && child.data.match(/^\s*$/) != null))
						return []
			}
			return
		},
	},
	{
		deserialize(el, _) {
			if (el.tagName != "IMG") return

			return {
				kind: "block",
				type: "img",
				isVoid: true,
				data: {src: el.attributes.getNamedItem('src').value},
			}
		}
	},
	{
		deserialize(el, _) {
			if (el.tagName != "HR") return

			return {
				kind: "block",
				type: "hr",
				isVoid: true,
			}
		}
	},
	{
		serialize(obj, children) {
			if (obj.kind != "inline") return
			
			if (obj.type == "link") {
				const href      = obj.data.get("href")
				const className = obj.data.get("class")

				return <a href={href} className={className}>{children}</a>
			}
		},
	},
	{
		deserialize(el, next) {
			const block = BLOCK_TAGS[el.tagName.toLowerCase()]
			if (!block) return

			const nodes = next(el.childNodes)

			if (nodes.length == 0 || (nodes.every(node => node.kind == "text" && node.text.match(/^\s*$/))))
				return []

			let attribs = {}

			console.log('el.attributes', el.attributes)
			for (let i = 0; i < el.attributes.length; i++) {
				attribs[el.attributes[i].name] = el.attributes[i].value
			}
			console.log('attribs', attribs)

			return {
				kind: "block",
				type: block,
				nodes,
				data: {attribs: attribs},
			}
		},
		serialize(obj, children) {
			if (obj.kind != "block") return

			// Special transform for headings
			if (obj.type.slice(0, 8) == "heading-") {
				const heading_number = Number(obj.type[8])
				switch (heading_number) {
					case 1: return <h1>{children}</h1>
					case 2: return <h2>{children}</h2>
					case 3: return <h3>{children}</h3>
					case 4: return <h4>{children}</h4>
					case 5: return <h5>{children}</h5>
					case 6: return <h6>{children}</h6>
				}
			}

			switch (obj.type) {
				case "paragraph": return <p>{children}</p>
				case "list":      return <ul>{children}</ul>
				case "caption":   return <caption>{children}</caption>
				case "list-item": return <li>{children}</li>
				case "num-list":  return <ol>{children}</ol>
				case "hr":        return <hr />
				case "tr":        return <tr {...colspan(obj.data)}>{children}</tr>
				case "td":        return <td {...colspan(obj.data)}>{children}</td>
				case "th":        return <th {...colspan(obj.data)}>{children}</th>
				case "aside":     return <aside>{children}</aside>
				case "img":
					const imgSrc = obj.data.get("src")
					return <img src={imgSrc} />
				case "figure":
					const src = obj.data.get("src")

					return (
						<figure>
							<img src={src} />
							<figcaption>{children}</figcaption>
						</figure>
					)
				case "table": return <table>{children}</table>
				case "tbody": return <tbody>{children}</tbody>
			}
		}
	},
	{
		deserialize(el, next) {
			let tagName = el.tagName
			// For MSWord which uses <b> not <strong>
			if (tagName == "B") tagName = "STRONG"

			const mark = MARK_TAGS[tagName.toLowerCase()]
			if (!mark) return
			return {
				kind: "mark",
				type: mark,
				nodes: next(el.childNodes)
			}
		},
		serialize(obj, children) {
			if (obj.kind != "mark") return

			switch (obj.type) {
				case "bold":       return <strong>{children}</strong>
				case "emphasis":   return <em>{children}</em>
				case "italic":     return <i>{children}</i>
				case "underlined": return <u>{children}</u>
				case "sub":        return <sub>{children}</sub>
				case "sup":        return <sup>{children}</sup>
			}
		},
	},
	{
		// Special case for figures
		deserialize(el, next) {
			if (el.tagName != "FIGURE") return

			// Find img
			const img = Array.prototype.find.call(el.childNodes, child => child.tagName == "IMG")

			// Find caption
			const caption = Array.prototype.find.call(el.childNodes, child => child.tagName == "FIGCAPTION")

			return {
				kind: "block",
				type: "figure",
				nodes: next(caption.childNodes),
				data: {
					src: img.attributes.getNamedItem('src').value,
				},
			}
		}
	},
	{
		// Special case for links, to grab their href.
		deserialize(el, next) {
			if (el.tagName != "A") return

			if (el.attributes.getNamedItem('href')) {
				return {
					kind:   "inline",
					type:   "link",
					nodes:  next(el.childNodes),
					data: {
						href: el.attributes.getNamedItem('href').value,
						class: el.attributes.getNamedItem('class') ? el.attributes.getNamedItem('class').value : undefined,
					},
				}
			}
		}
	}
]

const html_serializer = new Html({rules})

export function serialize(state) {
	// Beautify the output because Slate just produces a single line HTML mess which would
	// be very hard for the user to edit
	return html_beautify(
		html_serializer.serialize(state),
		{
			indent_size: 4,
			wrap_line_length: 60,
		}
	)
}

export function deserialize(html_string) {
	// Minify the HTML first to make it as easy as possible to normalize (strips irrelevant whitespace)
	// Then slate can do its magic
	// Note that Slate refusing to handle whitespace in HTML is a recognised
	// limitation that they have decided not to alter due to other concerns
	// See: https://github.com/ianstormtaylor/slate/issues/407
	return html_serializer.deserialize(
		html_clean(html_string)
	)
}
