import React    from "react"
import ReactDOM from "react-dom"
import uniq     from "lodash/uniq"

const temperature = ['hot', 'cold', 'lukewarm', 'frozen'].sort()
const texture     = ['jelly', 'liquid', 'mousse', 'sauce', 'smooth', 'soft', 'soft with texture'].sort()
const flavour     = ['savoury', 'sweet'].sort()

class RecipeBrowser extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			selected: [],
			search:   ''
		}

		this.renderTag      = this.renderTag.bind(this)
		this.renderRecipe   = this.renderRecipe.bind(this)
		this.onChangeSearch = this.onChangeSearch.bind(this)
	}

	onChangeSearch(e) {
		e.preventDefault()

		this.setState({search: e.target.value})
	}

	createOnClickTag(tag) {
		return e => {
			e.preventDefault()

			if (!this.state.selected.includes(tag))
				this.setState({selected: uniq(this.state.selected.concat(tag))})
			else
				this.setState({selected: this.state.selected.filter(t => t !== tag)})
		}
	}

	renderTag(tag) {
		return <a
			className={this.state.selected.includes(tag) ? '-selected' : ''}
			href={`#tag=${tag}`}
			onClick={this.createOnClickTag(tag)}
		>{tag}</a>
	}

	renderRecipe(recipe) {
		return <div className="recipe">
			<h3><a href={recipe.id}>{recipe.title}</a></h3>
			<p className="tags">{recipe.tags.sort().map(tag => <span className="tag">{tag}</span>)}</p>
		</div>
	}

	render() {
		const filtered = this.props.recipes
		// Tags
			.filter(recipe => {
				if (this.state.selected.length === 0)
					return true
				else
					return this.state.selected.every(tag => recipe.tags.indexOf(tag) !== -1)
			})
		// Search
			.filter(recipe =>
				this.state.search.toLowerCase().split(/[ ]+/).every(term => {
					if (term === '')
						return true
					else
						return recipe.title.toLowerCase().indexOf(term) !== -1
				})
			)

		return <div>
			<aside className="search-tags">
				<h3>Filter recipes</h3>
				<p><strong>Texture:</strong>     {texture.map(this.renderTag)}</p>
				<p><strong>Temperature:</strong> {temperature.map(this.renderTag)}</p>
				<p><strong>Taste:</strong>       {flavour.map(this.renderTag)}</p>
				<p>
					<input name="recipe-search" placeholder="Type to search recipes..."
						onChange={this.onChangeSearch} value={this.state.search} />
				</p>
				{this.props.recipes.length !== filtered.length &&
					<p>Showing {filtered.length} recipes out of {this.props.recipes.length}</p>}
			</aside>
			<div className="search-results">
				{filtered.map(this.renderRecipe)}
			</div>
		</div>
	}
}

document.addEventListener("DOMContentLoaded", _ => {
	let recipe_data = JSON.parse(document.getElementById('recipe_data').innerHTML)

	const div_in_document  = document.getElementById('recipe-browser')
	const container = document.createElement('div')
	container.className = 'recipe-browser'

	ReactDOM.render(<RecipeBrowser
		recipes={recipe_data}
	/>, container)
	
	div_in_document.parentNode.replaceChild(container.childNodes[0], div_in_document)
})
