import React from "react";
import {Html} from "slate";
import {html as html_beautify} from "js-beautify";
import {minify as html_minify} from "html-minifier";

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
	tr: "tr",
	td: "td",
	th: "th",
	aside: "aside",
};

// Add a dictionary of mark tags.
const MARK_TAGS = {
	strong: "bold",
	em:     "emphasis",
	i:      "italic",
	sub:    "sub",
	sup:    "sup",
};

const colspan = data => {
	if (data.get("attribs").colspan)
		return {colSpan: data.get("attribs").colspan};

	return {};
}

const rules = [
	{
		serialize(obj, children) {
			if (obj.kind != "inline") return;
			
			switch (obj.type) {
				case "link":
					const href = obj.data.get("href");
					return <a href={href}>{children}</a>;
			}
		},
	},
	{
		deserialize(el, next) {
			const block = BLOCK_TAGS[el.tagName];
			if (!block) return;

			return {
				kind:  "block",
				type:  block,
				nodes: next(el.children),
				data: {attribs: el.attribs},
			};
		},
		serialize(obj, children) {
			if (obj.kind != "block") return;

			// Special transform for headings
			if (obj.type.slice(0, 8) == "heading-") {
				const heading_number = Number(obj.type[8]);
				switch (heading_number) {
					case 1: return <h1>{children}</h1>;
					case 2: return <h2>{children}</h2>;
					case 3: return <h3>{children}</h3>;
					case 4: return <h4>{children}</h4>;
					case 5: return <h5>{children}</h5>;
					case 6: return <h6>{children}</h6>;
				}
			}

			switch (obj.type) {
				case "paragraph": return <p>{children}</p>;
				case "list":      return <ul>{children}</ul>;
				case "caption":   return <caption>{children}</caption>;
				case "list-item": return <li>{children}</li>;
				case "num-list":  return <ol>{children}</ol>;
				case "tr":        return <tr {...colspan(obj.data)}>{children}</tr>;
				case "td":        return <td {...colspan(obj.data)}>{children}</td>;
				case "th":        return <th {...colspan(obj.data)}>{children}</th>;
				case "aside":     return <aside>{children}</aside>;
				case "figure":
					const src = obj.data.get("src");

					return (
						<figure>
							<img src={src} />
							<figcaption>{children}</figcaption>
						</figure>
					);
				case "table": 
					const has_caption = obj.data.get("has_caption");
					if (has_caption) {
						return (
							<table>
								{children[0]}
								<tbody>{children.slice(1)}</tbody>
							</table>
						);
					}
					else {
						return <table>{children}</table>;
					}
			}
		}
	},
	{
		deserialize(el, next) {
			const mark = MARK_TAGS[el.tagName]
			if (!mark) return
			return {
				kind:  "mark",
				type:  mark,
				nodes: next(el.children)
			}
		},
		serialize(obj, children) {
			if (obj.kind != "mark") return;

			switch (obj.type) {
				case "bold":       return <strong>{children}</strong>;
				case "emphasis":   return <em>{children}</em>;
				case "italic":     return <i>{children}</i>;
				case "underlined": return <u>{children}</u>;
				case "sub":        return <sub>{children}</sub>;
				case "sup":        return <sup>{children}</sup>;
			}
		},
	},
	{
		// Special case for figures
		deserialize(el, next) {
			if (el.tagName != "figure") return;

			// Find img
			const img = el.children.find(child => child.tagName == "img");

			// Find caption
			const caption = el.children.find(child => child.tagName == "figcaption");

			return {
				kind:  "block",
				type:  "figure",
				nodes: next(caption.children),
				data: {
					src: img.attribs.src,
				},
			};
		}
	},
	{
		// Special case for tables blocks, which may have a caption and have nested tbody
		// need to grab their tbody child.
		deserialize(el, next) {
			if (el.tagName != "table") return;

			let children = el.children;

			// Extract caption
			let caption = children.find(child => child.tagName == "caption");
			if (caption) {
				children = children.filter(child => child != caption);
			}

			// Bypass tbody
			let tbody = children.find(child => child.tagName == "tbody");
			if (tbody) {
				children = tbody.children;
			}

			return {
				kind:  "block",
				type:  "table",
				nodes: next(caption ? [caption].concat(children) : children),
				data: {
					has_caption: Boolean(caption),
				},
			}
		}
	},
	{
		// Special case for links, to grab their href.
		deserialize(el, next) {
			if (el.tagName != "a") return
			return {
				kind:  "inline",
				type:  "link",
				nodes: next(el.children),
				data: {
					href: el.attribs.href
				}
			}
		}
	}
];

const html_serializer = new Html({rules});

export function serialize(state) {
	// Beautify the output because Slate just produces a single line HTML mess which would
	// be very hard for the user to edit
	return html_beautify(
		html_serializer.serialize(state),
		{
			indent_size: 4,
			wrap_line_length: 60,
		}
	);
};

export function deserialize(html_string) {
	// Minify the HTML first to make it as easy as possible to normalize (strips irrelevant whitespace)
	// Then slate can do its magic
	// Note that Slate refusing to handle whitespace in HTML is a recognised
	// limitation that they have decided not to alter due to other concerns
	// See: https://github.com/ianstormtaylor/slate/issues/407
	return html_serializer.deserialize(
		html_minify(html_string, {
			collapseWhitespace: true,
		})
	);
};