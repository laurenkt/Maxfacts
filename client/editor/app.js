import React from "react";
import ReactDOM from "react-dom";
import {Editor as RichTextEditor} from "slate";
import {serialize, deserialize} from "./serializer.js";
import Schema from "./schema.js";

class Editor extends React.Component {
	constructor(props) {
		super(props);

		const initial_state = deserialize(props.value);

		this.state = {
			slate_state:     initial_state,
			html_value:      serialize(initial_state),
			editing_in_html: false,
		};

		this.onTextAreaChange = this.onTextAreaChange.bind(this);
		this.onEditorChange   = this.onEditorChange.bind(this);
		this.onDocumentChange = this.onDocumentChange.bind(this);
		this.onEditModeChange = this.onEditModeChange.bind(this);

		this.rows = Math.min(props.value.split(/\r?\n/).length, 20);
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
		console.log("onEditorChange");
		this.setState({slate_state: state});
	}

	onTextAreaChange(e) {
		console.log("onTextAreaChange");
		this.rows = Math.min(e.target.value.split(/\r?\n/).length, 20);
		this.setState({html_value: e.target.value});
	}

	onDocumentChange(document, state) {
		console.log("onDocumentChange");
		this.setState({html_value: serialize(state)});
	}

	onEditModeChange(e) {
		console.log("onEditModeChange", e.target.checked, this.state.html_value);
		this.setState({
			editing_in_html: e.target.checked,
			slate_state: e.target.checked ? this.state.slate_state : deserialize(this.state.html_value),
		});
	}

	hasMark(type) {
		const state = this.state.slate_state;
		return state.marks.some(mark => mark.type == type);
	}

	/**
	 * Check if the any of the currently selected blocks are of `type`.
	 *
	 * @param {String} type
	 * @return {Boolean}
	 */
	hasBlock(type) {
		const state = this.state.slate_state;
		return state.blocks.some(node => node.type == type);
	}

	/**
	 * When a mark button is clicked, toggle the current mark.
	 *
	 * @param {Event} e
	 * @param {String} type
	 */
	onClickMark(e, type) {
		e.preventDefault()
		let state = this.state.slate_state;

		state = state
			.transform()
			.toggleMark(type)
			.apply()

		this.setState({ slate_state:state })
	}

	/**
	 * When a block button is clicked, toggle the block type.
	 *
	 * @param {Event} e
	 * @param {String} type
	 */

	onClickBlock(e, type) {
		const DEFAULT_NODE = "paragraph";

		e.preventDefault()
		let state = this.state.slate_state;
		let transform = state.transform()
		const { document } = state

		// Handle everything but list buttons.
		if (type != 'list' && type != 'num-list') {
			const isActive = this.hasBlock(type)
			const isList = this.hasBlock('list-item')

			if (isList) {
				transform
					.setBlock(isActive ? DEFAULT_NODE : type)
					.unwrapBlock('list')
					.unwrapBlock('num-list')
			}

			else {
				transform
					.setBlock(isActive ? DEFAULT_NODE : type)
			}
		}

		// Handle the extra wrapping required for list buttons.
		else {
			const isList = this.hasBlock('list-item')
			const isType = state.blocks.some((block) => {
				return !!document.getClosest(block.key, parent => parent.type == type)
			})

			if (isList && isType) {
				transform
					.setBlock(DEFAULT_NODE)
					.unwrapBlock('list')
					.unwrapBlock('num-list')
			} else if (isList) {
				transform
					.unwrapBlock(type == 'list' ? 'num-list' : 'list')
					.wrapBlock(type)
			} else {
				transform
					.setBlock('list-item')
					.wrapBlock(type)
			}
		}

		state = transform.apply()
		this.setState({ slate_state:state })
	}

	renderToolbar() {
		return (
			<div className="menu toolbar-menu">
				{this.renderMarkButton('bold', 'format_bold')}
				{this.renderMarkButton('emphasis', 'format_italic')}
				{this.renderBlockButton('heading-1', 'looks_one')}
				{this.renderBlockButton('heading-2', 'looks_two')}
				{this.renderBlockButton('heading-3', 'looks_3')}
				{this.renderBlockButton('num-list', 'format_list_numbered')}
				{this.renderBlockButton('list', 'format_list_bulleted')}
			</div>
		)
	}

	renderMarkButton(type, icon) {
		const isActive = this.hasMark(type)
		const onMouseDown = e => this.onClickMark(e, type)

		return (
			<span className="button" onMouseDown={onMouseDown} data-active={isActive}>
				<span className="material-icons">{icon}</span>
			</span>
		)
	}

	renderBlockButton(type, icon) {
		const isActive = this.hasBlock(type)
		const onMouseDown = e => this.onClickBlock(e, type)

		return (
			<span className="button" onMouseDown={onMouseDown} data-active={isActive}>
				<span className="material-icons">{icon}</span>
			</span>
		)
	}

	render() {
		return (
			<div className="content-editor">
				<p className="menu editmode-menu">
					<label>
						<input
							type="checkbox"
							onChange={this.onEditModeChange}
							checked={null} />
						<span className="label-body">Edit in raw HTML</span>
					</label>
				</p>
				<textarea
					rows={this.rows}
					name={this.props.name}
					style={{display: this.state.editing_in_html ? "block" : "none"}}
					onChange={this.onTextAreaChange}
					value={this.state.html_value} />
				{!this.state.editing_in_html && 
					this.renderToolbar()}
				{!this.state.editing_in_html &&
					<RichTextEditor
						schema={Schema}
						state={this.state.slate_state}
						onChange={this.onEditorChange}
						onDocumentChange={this.onDocumentChange} />}
			</div>
		);
	}
}

document.addEventListener("DOMContentLoaded", e => {
	const textarea  = document.getElementsByTagName("textarea").item(0);
	const container = document.createElement("div");
	container.className = "content-editor";

	ReactDOM.render(<Editor name={textarea.getAttribute("name")} value={textarea.value} />, container);
	
	textarea.parentNode.replaceChild(container.childNodes[0], textarea);
});
