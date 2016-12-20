import React from "react";
import ReactDOM from "react-dom";
import {Editor as RichTextEditor,
        Html} from "slate";

const BLOCK_TAGS = {
	p: "paragraph",
	li: "list-item",
	ul: "bulleted-list",
	ol: "numbered-list",
	blockquote: "quote",
	pre: "code",
	h1: "heading-one",
	h2: "heading-two",
	h3: "heading-three",
	h4: "heading-four",
	h5: "heading-five",
	h6: "heading-six"
}

// Add a dictionary of mark tags.
const MARK_TAGS = {
	strong: "bold",
	em: "italic",
	u: "underline",
	s: "strikethrough",
	code: "code"
}

const schema = {
	nodes: {
		"paragraph": props => <p {...props.attributes}>{props.children}</p>,
		"bulleted-list": props => <ul {...props.attributes}>{props.children}</ul>,
		"code": props => <pre><code {...props.attributes}>{props.children}</code></pre>,
		"heading-one": props => <h1 {...props.attributes}>{props.children}</h1>,
		"heading-two": props => <h2 {...props.attributes}>{props.children}</h2>,
		"heading-three": props => <h3 {...props.attributes}>{props.children}</h3>,
		"heading-four": props => <h4 {...props.attributes}>{props.children}</h4>,
		"heading-five": props => <h5 {...props.attributes}>{props.children}</h5>,
		"heading-six": props => <h6 {...props.attributes}>{props.children}</h6>,
		"list-item": props => <li {...props.attributes}>{props.children}</li>,
		"numbered-list": props => <ol {...props.attributes}>{props.children}</ol>,
		"quote": props => <blockquote {...props.attributes}>{props.children}</blockquote>,
		"link": (props) => {
			const { data } = props.node;
			const href = data.get("href");
			return <a href={href} {...props.attributes}>{props.children}</a>;
		},
	},
	marks: {
		bold: props => <strong>{props.children}</strong>,
		code: props => <code>{props.children}</code>,
		italic: props => <em>{props.children}</em>,
		underlined: props => <u>{props.children}</u>,
	}
};

const rules = [
	{
		serialize(obj, children) {
			if (obj.kind != "inline") return;

			if (schema.nodes[obj.type])
				return schema.nodes[obj.type]({attributes: {}, node: {data: obj.data}, children});
		}
	},
	{
		deserialize(el, next) {
			const block = BLOCK_TAGS[el.tagName]
			if (!block) return
			return {
				kind: "block",
				type: block,
				nodes: next(el.children)
			};
		},
		serialize(obj, children) {
			if (obj.kind != "block") return;

			if (schema.nodes[obj.type])
				return schema.nodes[obj.type]({attributes: {}, children});
		},
	},
	{
		deserialize(el, next) {
			const mark = MARK_TAGS[el.tagName]
			if (!mark) return
			return {
				kind: "mark",
				type: mark,
				nodes: next(el.children)
			}
		},
		serialize(obj, children) {
			if (obj.kind != "mark") return;

			if (schema.marks[obj.type])
				return schema.marks[obj.type]({attributes: {}, children});
		},
	},
	{
		// Special case for code blocks, which need to grab the nested children.
		deserialize(el, next) {
			if (el.tagName != "pre") return
			const code = el.children[0]
			const children = code && code.tagName == "code"
				? code.children
				: el.children

			return {
				kind: "block",
				type: "code",
				nodes: next(children)
			}
		}
	},
	{
		// Special case for links, to grab their href.
		deserialize(el, next) {
			if (el.tagName != "a") return
			return {
				kind: "inline",
				type: "link",
				nodes: next(el.children),
				data: {
					href: el.attribs.href
				}
			}
		}
	}
];

class Editor extends React.Component {
	constructor(props) {
		super(props);

		this.htmlSerializer = new Html({rules});

		this.state = {
			state: this.htmlSerializer.deserialize(props.value),
			value: props.value,
			html: false,
		};

		this.onTextAreaChange     = this.onTextAreaChange.bind(this);
		this.onEditorChange     = this.onEditorChange.bind(this);
		this.onDocumentChange = this.onDocumentChange.bind(this);
		this.onEditModeChange = this.onEditModeChange.bind(this);

		this.value = props.value;
		this.rows = props.value.split(/\r?\n/).length;
	}

	static get propTypes() {
		return {
			onChange: React.PropTypes.func,
			state:    React.PropTypes.object,
			value:    React.PropTypes.string,
			id:       React.PropTypes.string,
		};
	}

	onEditorChange(state) {
		this.setState({state});
	}

	onTextAreaChange(e) {
		this.rows = e.target.value.split(/\r?\n/).length;
		this.setState({value: e.target.value});
	}

	onDocumentChange(document, state) {
		this.setState({value: this.htmlSerializer.serialize(state)});
	}

	onEditModeChange(e) {
		this.setState({
			html: e.target.checked,
			state: e.target.checked ? this.state.state : this.htmlSerializer.deserialize(this.state.value),
		});
	}

	render() {
		return (
			<div>
				<p><label>
					<input type="checkbox" onChange={this.onEditModeChange} checked={null} />
					<span className="label-body">Edit in raw HTML</span>
				</label></p>
				<textarea rows={this.rows} name={this.props.name} style={{display: this.state.html ? "block" : "none"}} onChange={this.onTextAreaChange} value={this.state.value}></textarea>
				{this.state.html ||
					<RichTextEditor schema={schema} state={this.state.state} onChange={this.onEditorChange} onDocumentChange={this.onDocumentChange} />}
			</div>
		);
	}
}

document.addEventListener("DOMContentLoaded", e => {
	var textarea  = document.getElementsByTagName("textarea").item(0);
	var container = document.createElement("div");
	ReactDOM.render(<Editor name={textarea.getAttribute("name")} value={textarea.value} />, container);
	
	textarea.parentNode.replaceChild(container.childNodes[0], textarea);
});
