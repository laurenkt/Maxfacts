import React from "react";
import ReactDOM from "react-dom";
import {Editor as RichTextEditor} from "slate";
import {serialize, deserialize} from "./serializer.js";
import Schema from "./schema.js";

class Editor extends React.Component {
	constructor(props) {
		super(props);

		const initial_state = deserialize(props.value != "" ? props.value : '<p></p>');

		this.state = {
			slate_state:     initial_state,
			html_value:      serialize(initial_state),
			editing_in_html: false,
		};

		this.onTextAreaChange = this.onTextAreaChange.bind(this);
		this.onEditorChange   = this.onEditorChange.bind(this);
		this.onDocumentChange = this.onDocumentChange.bind(this);
		this.onEditModeChange = this.onEditModeChange.bind(this);

		this.rows = Math.max(props.value.split(/\r?\n/).length, 20);

		document.addEventListener("scroll", this.onScroll.bind(this));
	}

	static get propTypes() {
		return {
			onChange: React.PropTypes.func,
			state:    React.PropTypes.object,
			value:    React.PropTypes.string,
			id:       React.PropTypes.string,
		};
	}

	onScroll(e) {
		// Only do this when the toolbar exists
		if (this.toolbar) {
			// And when its parent is above the viewport (so it would be too)
			const {top} = this.toolbar.parentNode.getBoundingClientRect();
			if (top < 0) {
				const width = this.toolbar.parentNode.clientWidth;
				const offset_y = window.scrollY - this.toolbar.offsetParent.offsetTop;
				
				this.toolbar.style.position = "absolute";
				this.toolbar.style.top      = `${offset_y}px`;
				this.toolbar.style.width    = `${width}px`;
			}
			else {
				this.toolbar.style.position = "inherit";
			}
		}
	}

	onEditorChange(state) {
		this.setState({slate_state: state});
	}

	onTextAreaChange(e) {
		this.rows = Math.min(e.target.value.split(/\r?\n/).length, 20);
		this.setState({html_value: e.target.value});
	}

	onDocumentChange(document, state) {
		this.setState({html_value: serialize(state)});
	}

	onEditModeChange(e) {
		this.setState({
			editing_in_html: e.target.checked,
			slate_state: e.target.checked ? this.state.slate_state : deserialize(this.state.html_value),
		});
	}

	onPaste(e, data, state) {
		console.log(data.html);
	}

	hasMark(type) {
		const state = this.state.slate_state;
		return state.marks.some(mark => mark.type == type);
	}

	/**
	 * Check whether the current selection has an inline in it.
	 *
	 * @return {Boolean} hasLinks
	 */

	hasInline(type) {
		const state = this.state.slate_state;
		return state.inlines.some(inline => inline.type == type);
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

		this.setState({ slate_state:state, html_value: serialize(state) })
	}

	/**
	 *
	 */
	onClickInline(e, type) {
		e.preventDefault()

		let state = this.state.slate_state;

		if (type == 'link') {
			const hasLinks = this.hasInline('link')

			if (hasLinks) {
				state = state
					.transform()
					.unwrapInline('link')
					.apply()
			}

			else if (state.isExpanded) {
				// Find what text the user has selected
				const selected_text = state.document.getDescendant(state.focusKey).text.slice(state.startOffset, state.endOffset);

				// Extract any url in a [...], filter out preceding or trailing whitespace
				const matched_url = selected_text.match(/[ ]*\[(.*?)\][ ]*$/);
				let suggested_url = '';

				if (matched_url && matched_url.length >= 2)
					suggested_url = matched_url[1]; // First match

				const href = window.prompt('Enter the URL of the link:', suggested_url)

				// Only if the user didn't cancel
				if (href) {
					state = state
						.transform()
						.wrapInline({
							type: 'link',
							data: { href }
						})
						.collapseToEnd()
						.deleteBackward(matched_url ? matched_url[0].length : 0)
						.apply()
				}
			}

			else {
				const href = window.prompt('Enter the URL of the link:')

				if (href) {
					const text = window.prompt('Enter the text for the link:')

					if (text) {
						state = state
							.transform()
							.insertText(text)
							.extendBackward(text.length)
							.wrapInline({
								type: 'link',
								data: { href }
							})
							.collapseToEnd()
							.apply()
					}
				}
			}

			this.setState({ slate_state:state, html_value: serialize(state) })
		}
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
		
		// aside must nest paragraphs rather than replace them
		if (type == 'aside') {
			const isActive = this.hasBlock(type)
			const isType = state.blocks.some((block) => {
				return !!document.getClosest(block.key, parent => parent.type == type)
			})

			if (isType) {
				transform
					.unwrapBlock(type);
			}
			else {
				transform.wrapBlock(type);
			}
		}

		else
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
		this.setState({ slate_state:state, html_value: serialize(state) })
	}

	renderToolbar() {
		return (
			<div ref={toolbar => this.toolbar = toolbar} className="menu toolbar-menu">
				{this.renderMarkButton('bold', 'format_bold')}
				{this.renderMarkButton('emphasis', 'format_italic')}
				{this.renderMarkButton('sub', 'trending_down')}
				{this.renderMarkButton('sup', 'trending_up')}
				{this.renderInlineButton('link', 'link')}
				{this.renderBlockButton('heading-1', 'looks_one')}
				{this.renderBlockButton('heading-2', 'looks_two')}
				{this.renderBlockButton('heading-3', 'looks_3')}
				{this.renderBlockButton('num-list', 'format_list_numbered')}
				{this.renderBlockButton('list', 'format_list_bulleted')}
				{this.renderBlockButton('aside', 'comment')}
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

	renderInlineButton(type, icon) {
		const isActive = this.hasInline(type)
		const onMouseDown = e => this.onClickInline(e, type)

		return (
			<span className="button" onMouseDown={onMouseDown} data-active={isActive}>
				<span className="material-icons">{icon}</span>
			</span>
		)
	}

	renderBlockButton(type, icon) {
		let isActive = this.hasBlock(type)
		const onMouseDown = e => this.onClickBlock(e, type)

		// Aside needs to recognise parent too
		if (type == 'aside') {
			isActive = isActive || this.state.slate_state.blocks.some((block) => {
				return !!this.state.slate_state.document.getClosest(block.key, parent => parent.type == type)
			})
		}

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
					rows={Math.max(this.props.value.split(/\r?\n/).length, 20)}
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
						onDocumentChange={this.onDocumentChange}
						onPaste={this.onPaste} />}
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
