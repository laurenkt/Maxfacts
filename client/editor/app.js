import React    from "react"
import ReactDOM from "react-dom"
import Schema   from "./schema.js"
import {Editor as RichTextEditor, Raw} from "slate"
import SoftBreak from "slate-soft-break"
import normalize from "./msword_normalizer.js"
import {serialize, deserialize}   from "./html_serializer.js"

const TextField = ({name, value, onChange, defaultValue, children, className}) =>
	<p className="label-input" key={name}>
		<label htmlFor={name}>{children}</label>
		<input type="text" className={className || ''} name={name} id={name} onChange={onChange} value={value} defaultValue={defaultValue} />
	</p>

const CheckBox = ({name, checked, defaultChecked, children}) =>
	<p>
		<label htmlFor={name}>
			<input type="checkbox" name={name} id={name} checked={checked} defaultChecked={defaultChecked} />
			{children}
		</label>
	</p>

const plugins = [
	SoftBreak({shift: true}),
]

function normalizeURI(uri) {
	// Force the URI into acceptable format:
	return uri
		// All lowercase
		.toLowerCase()
		// Convert spaces and underscores to dashes (and multiple dashes)
		.replace(/[_ -]+/g, "-")
		// Remove any duplicate slashes
		.replace(/[\/]+/g, "/")
		// Remove any leading or trailing slashes or dashes
		.replace(/(^[\/-]+|[\/-]+$)/g, "")
		// Remove any remaining characters that don"t conform to the URL
		.replace(/[^a-z0-9-\/]+/g, "")
}

class Editor extends React.Component {
	constructor(props) {
		super(props)

		const {content} = props

		const initial_state = (content.body && content.body != "") ?
			deserialize(content.body) :
			Raw.deserialize({nodes: [
				{
					kind: 'block',
					nodes: [],
					type: 'paragraph',
				}
			]}, {terse: true})

		this.state = {
			id:       content.id,
			uri:      content.uri,
			title:    content.title,
			body:     content.body || "",	
			description: content.description,
			surtitle: content.surtitle,
			order:    content.order,
			type:     content.type,
			hide:     content.hide,
			redirect_uri:
			          content.redirect_uri,
			has_sublist:
			          content.has_subtlist,
			further_reading_uri:
			          content.further_reading_uri,
			slate:    initial_state,
			editing_in_html: false,
		}

		this.touched = {
			id:       !!content.id,
			uri:      !!content.uri,
			title:    !!content.title,
			body:     !!content.body,
			description: !!content.description,
			surtitle: !!content.surtitle,
			order:    !!content.order,
			type:     !!content.type,
			has_sublist:
			          !!content.has_sublist,
			further_reading_uri:
			          !!content.further_reading_uri,
		}
		this.rows = Math.max(this.state.body.split(/\r?\n/).length, 20)

		this.onTextAreaChange = this.onTextAreaChange.bind(this)
		this.onEditorChange   = this.onEditorChange.bind(this)
		this.onSubmit         = this.onSubmit.bind(this)
		this.onEditModeChange = this.onEditModeChange.bind(this)
		this.onKeyDown        = this.onKeyDown.bind(this)
		this.onChangeID       = this.onChangeID.bind(this)
		this.onChangeURI      = this.onChangeURI.bind(this)
		this.onChangeType     = this.onChangeType.bind(this)

		document.addEventListener("scroll", this.onScroll.bind(this))
	}

	static get propTypes() {
		return {
			content: React.PropTypes.object,
		}
	}

	/**
	 * Keyboard shortcuts
	 */
	onKeyDown(e, data, _) {
		if (!data.isMod) return

		switch (data.key) {
			case 'b': return this.onClickMark(e, 'bold')
			case 'i': return this.onClickMark(e, 'emphasis')
			case '1': return this.onClickBlock(e, 'heading-1')
			case '2': return this.onClickBlock(e, 'heading-2')
			case '3': return this.onClickBlock(e, 'heading-3')
			default: return
		}
	}

	onScroll(_) {
		// Only do this when the toolbar exists
		if (this.toolbar) {
			// And when its parent is above the viewport (so it would be too)
			const {top} = this.toolbar.parentNode.getBoundingClientRect()
			if (top < 0) {
				const width = this.toolbar.parentNode.clientWidth
				const offset_y = window.scrollY - this.toolbar.offsetParent.offsetTop
				
				this.toolbar.style.position = "absolute"
				this.toolbar.style.top      = `${offset_y}px`
				this.toolbar.style.width    = `${width}px`
			}
			else {
				this.toolbar.style.position = "inherit"
			}
		}
	}

	onEditorChange(state) {
		this.touched['slate'] = true
		this.setState({slate: state})
	}

	onTextAreaChange(e) {
		this.touched['body'] = true
		this.rows = Math.min(e.target.value.split(/\r?\n/).length, 20)
		this.setState({body: e.target.value})
	}

	onSubmit() {
		if (!this.state.editing_in_html)
			this.setState({body: serialize(this.state.slate)})
	}

	onEditModeChange(e) {
		let new_state = {
			editing_in_html: e.target.checked
		}

		if (this.state.editing_in_html)
			new_state.slate = deserialize(this.state.body)
		else
			new_state.body = serialize(this.state.slate)

		this.setState(new_state)
	}

	/**
	 * On paste, deserialize the HTML and then insert the fragment.
	 *
	 * @param {Event} e
	 * @param {Object} data
	 * @param {State} state
	 */
	onPaste(e, data, state) {
		// TODO: convert pasted word doc into our doc
		// will need URL converter
		// <span color='red'>...</span> is links links
		if (data.type != "html") return
		if (data.isShift) return
		
		const { document } = deserialize(normalize(data.html))

		return state
			.transform()
			.insertFragment(document)
			.apply()
	}

	hasMark(type) {
		const state = this.state.slate
		return state.marks.some(mark => mark.type == type)
	}

	/**
	 * Check whether the current selection has an inline in it.
	 *
	 * @return {Boolean} hasLinks
	 */

	hasInline(type) {
		const state = this.state.slate
		return state.inlines.some(inline => inline.type == type)
	}

	/**
	 * Check if the any of the currently selected blocks are of `type`.
	 *
	 * @param {String} type
	 * @return {Boolean}
	 */
	hasBlock(type) {
		const state = this.state.slate
		return state.blocks.some(node => node.type == type)
	}

	/**
	 * When a mark button is clicked, toggle the current mark.
	 *
	 * @param {Event} e
	 * @param {String} type
	 */
	onClickMark(e, type) {
		e.preventDefault()
		let state = this.state.slate

		state = state
			.transform()
			.toggleMark(type)
			.apply()

		this.setState({slate:state, html_value: serialize(state) })
	}

	/**
	 *
	 */
	onClickInline(e, type, is_editing) {
		e.preventDefault()

		let state = this.state.slate

		if (type == 'link') {
			const hasLinks = this.hasInline('link')

			if (hasLinks) {
				if (!is_editing) {
					state = state
						.transform()
						.unwrapInline('link')
						.apply()
				}
				else {
					const this_link = state.inlines.find(node => node.type == 'link')
					const suggested_url = this_link.get("data").get("href")
					const href = window.prompt('Enter the URL of the link:', suggested_url)
					if (href) {
						state = state
							.transform()
							.setInline({data: {href}})
							.apply()
					}
				}
			}

			else if (state.isExpanded) {
				// Find what text the user has selected
				const selected_text = state.document.getDescendant(state.focusKey).text.slice(state.startOffset, state.endOffset)

				// Extract any url in a [...], filter out preceding or trailing whitespace
				const matched_url = selected_text.match(/[ ]*\[(.*?)\][ ]*$/)
				let suggested_url = ''

				if (matched_url && matched_url.length >= 2)
					suggested_url = matched_url[1] // First match

				const chars_to_remove = matched_url ? matched_url[0].length : 0

				const href = window.prompt('Enter the URL of the link:', suggested_url)

				// Only if the user didn't cancel
				if (href) {
					state = state
						.transform()
						.insertText(selected_text.slice(0, selected_text.length - chars_to_remove))
						// For one reason or another Slate seems to collapse the selection when this happens
						// Reselect the word at the right point
						.moveTo({
							anchorKey:    state.anchorKey,
							anchorOffset: state.startOffset,
							focusKey:     state.focusKey,
							focusOffset:  state.startOffset + (selected_text.length - chars_to_remove),
							isBackward:   false,
							isFocused:    true,
						})
						.wrapInline({
							type: 'link',
							data: { href },
						})
						.collapseToEnd()
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
								data: { href },
							})
							.collapseToEnd()
							.apply()
					}
				}
			}

			this.setState({slate:state, html_value: serialize(state) })
		}
	}

	/**
	 * When a block button is clicked, toggle the block type.
	 *
	 * @param {Event} e
	 * @param {String} type
	 */

	onClickBlock(e, type) {
		const DEFAULT_NODE = "paragraph"

		e.preventDefault()
		let state = this.state.slate
		let transform = state.transform()
		const { document } = state
		
		// aside must nest paragraphs rather than replace them
		if (type == 'aside') {
			const isType = state.blocks.some(block => {
				return !!document.getClosest(block.key, parent => parent.type == type)
			})

			if (isType)
				transform.unwrapBlock(type)
			else
				transform.wrapBlock(type)
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
		this.setState({slate:state, html_value: serialize(state) })
	}

	renderToolbar() {
		return (
			<div ref={toolbar => this.toolbar = toolbar} className="menu toolbar-menu">
				{this.renderMarkButton('bold', 'format_bold')}
				{this.renderMarkButton('emphasis', 'format_italic')}
				{this.renderMarkButton('sub', 'trending_down')}
				{this.renderMarkButton('sup', 'trending_up')}
				{this.renderInlineButton('link', 'link')}
				{this.hasInline('link') &&
					this.renderInlineButton('link', 'edit')}
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
		const is_editing = icon == 'edit'
		const onMouseDown = e => this.onClickInline(e, type, is_editing)

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
			isActive = isActive || this.state.slate.blocks.some((block) => {
				return !!this.state.slate.document.getClosest(block.key, parent => parent.type == type)
			})
		}

		return (
			<span className="button" onMouseDown={onMouseDown} data-active={isActive}>
				<span className="material-icons">{icon}</span>
			</span>
		)
	}

	onChangeID(e) {
		this.touched['id'] = true
		
		let new_state = {id: e.target.value}

		if (!this.touched.type) {
			if (new_state.id.match(/-preamble/i))
				new_state.type = "directory"
			else if (new_state.id.match(/-level1$/i))
				new_state.type = "level1"
			else if (new_state.id.match(/-level2$/i))
				new_state.type = "level2"
			else if (new_state.id.match(/-level3$/i))
				new_state.type = "level3"
			else if (new_state.id.match(/-further-reading-and-info/i))
				new_state.type = "further"
			else
				new_state.type = "page"
		}

		if (!this.touched.uri) {
			new_state.uri = ""
			let unprocessed = e.target.value
			let end_part = ""
			let match

			// Top level
			if ((match = unprocessed.match(/^diagnosis-list(.*)/i))) {
				new_state.uri = "diagnosis/a-z/"
				unprocessed = match[1] // remainder of string
			}
			else if (match = unprocessed.match(/^help-selfhelp(.*)/i)) {
				new_state.uri = "help/"
				unprocessed = match[1]
			}
			else if (match = unprocessed.match(/^([a-z]*)-(.*)/i)) {
				new_state.uri = match[1] + "/"
				unprocessed = match[2]
			}
			else if (match = unprocessed.match(/^[a-z]*$/i)) {
				new_state.uri = unprocessed
				unprocessed = ""
			}

			// Extract page type
			if (match = unprocessed.match(/(.*)-preamble/i)) {
				end_part = ""
				unprocessed = match[1]
			}
			else if (match = unprocessed.match(/(.*)-level1$/i)) {
				// TODO: use all_uris list to determine if a preamble exists for this, then use /getting-started
				end_part = ""
				unprocessed = match[1]
			}
			else if (match = unprocessed.match(/(.*)-level2$/i)) {
				end_part = "/more-info"
				unprocessed = match[1]
			}
			else if (match = unprocessed.match(/(.*)-level3$/i)) {
				end_part = "/detailed"
				unprocessed = match[1]
			}
			else if (match = unprocessed.match(/(.*)-further-reading-and-info$/i)) {
				end_part = "/further-reading"
				unprocessed = match[1]
			}

			// Strip first - if there is one
			if (unprocessed.length > 0 && unprocessed[0] == '-')
				unprocessed = unprocessed.slice(1)

			// Preprocess some special cases that should always be left together
			// TODO: FINISH THIS
			const reserved_pairs = [
				"benign-lump",
				"bone-lesion",
				"neoplastic-benign",
				"neoplastic-malignant",
				"broken-tooth",
				"mouth-cancer",
				"facial-skin-cancer",
				"salivary-gland-cancer",
				"cleft-lip-palate",
				"craniofacial-syndrome",
				"ectopic-teeth",
				"facial-appearance",
				"facial-pain-syndrome",
				"jaw-disproportion",
				"jaw-joint",
				"missing-teeth",
				"mouth-ulcer",
				"postoperative-problems",
				"floor-of-mouth",
				"upper-arm",
				"lower-arm",
				"lower-leg",
				"haematological-malignancy",
				"oral-food",
				"non-oral-food",
				"ng-tube",
				"ternary-graphs", 
				"mental-health",
				"patient-recovery",
				"saliva-and-eating",
				"swallowing-anatomy-physiology",
				"texture-modifiers",
				"taste-exploitation",
				"texture-adaption",
				"oral-hygiene",
				"extreme-temperatures",
				"new-developments",
				"hyperbaric-oxygen",
				"photodynamic-therapy",
			]

			reserved_pairs.forEach(fragment => unprocessed = unprocessed.replace(fragment, fragment.replace('-', '_')))

			// Append unprocessed and end portions
			new_state.uri += unprocessed.replace(/-/g, '/').replace(/_/g, '-')
			new_state.uri += end_part
			new_state.uri = normalizeURI(new_state.uri)
		}

		this.setState(new_state)
	}

	onChangeURI(e) {
		this.touched['uri'] = true
		this.setState({uri: e.target.value})
	}

	onChangeType(e) {
		this.touched['type'] = true
		this.setState({type: e.target.value})
	}

	render() {
		return (
			<form method="post" action="#" onSubmit={this.onSubmit}>
				<TextField name="id" value={this.state.id} onChange={this.onChangeID}>ID</TextField>
				<TextField name="uri" value={this.state.uri} onChange={this.onChangeURI}
					className={this.touched.uri ? "" : "-suggested"}>URI</TextField>
				<TextField name="title" defaultValue={this.state.title} className="-large">Title</TextField>
				<TextField name="description" defaultValue={this.state.description}>Subtitle</TextField>
				<TextField name="surtitle" defaultValue={this.state.surtitle}>Surtitle</TextField>
				<TextField name="redirect_uri" defaultValue={this.state.redirect_uri}>Redirect URI</TextField>
				<p className="label-input">
					<label htmlFor="type">Type</label>
					<select name="type" id="type" value={this.state.type} onChange={this.onChangeType}>
						<option value="page">Uncategorised page</option>
						<option value="directory">Preamble</option>
						<option value="level3">Level 3 - detailed information</option>
						<option value="level2">Level 2 – getting to know more</option>
						<option value="level1">Level 1 – getting started</option>
						<option value="further">Further reading</option>
					</select>
				</p>
				<TextField name="order" defaultValue={this.state.order || "0"}>Order</TextField>
				<TextField name="further_reading_uri" defaultValue={this.state.further_reading_uri}>Further reading URI</TextField>
				<CheckBox name="has_sublist" defaultChecked={this.state.has_sublist}>Display child pages in same column as this page</CheckBox>
				<CheckBox name="hide" defaultChecked={this.state.hide}>Hide in directory</CheckBox>
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
						name="body"
						style={{display: this.state.editing_in_html ? "block" : "none"}}
						onChange={this.onTextAreaChange}
						value={this.state.body} />
					{!this.state.editing_in_html && 
						this.renderToolbar()}
					{!this.state.editing_in_html &&
						<RichTextEditor
							schema={Schema(this.props.content.all_uris)}
							state={this.state.slate}
							onChange={this.onEditorChange}
							plugins={plugins}
							onPaste={this.onPaste}
							onKeyDown={this.onKeyDown} />}
				</div>
				<p><input type="submit" value="Save" /></p>
			</form>
		)
	}
}

document.addEventListener("DOMContentLoaded", _ => {
	let data_node = document.getElementById("editor_data")
	let content = JSON.parse(data_node.innerHTML)

	const container = document.createElement("div")
	container.className = "content-editor"

	ReactDOM.render(<Editor 
		content={content}
	/>, container)
	
	data_node.parentNode.replaceChild(container, data_node)
})
