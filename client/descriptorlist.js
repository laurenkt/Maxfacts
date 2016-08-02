import React from 'react';

module.exports = class DescriptorList extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			selected: []
		};
	}

	static get propTypes() {
		return {
			onSelection: React.PropTypes.func,
			items:       React.PropTypes.array
		};
	}

	onChange(descriptor, e) {
		var new_selected = e.target.checked ?
			this.state.selected.concat([descriptor]) :
			this.state.selected.filter(d => d != descriptor);

		// Always show items in the same order
		new_selected = new_selected.sort();

		this.setState({selected: new_selected});

		// Raise callback
		if (this.props.onSelection)
			this.props.onSelection(new_selected);
	}

	render() {
		return (
			<div className="checkboxes">
				{this.props.items.sort().map(d => {
					var disabled = !this.state.selected.includes(d) && this.state.selected.length >= 3;

					return (
						<label key={d} className={disabled ? 'disabled' : ''}>
							<input type="checkbox" onChange={this.onChange.bind(this, d)}
								checked={this.state.selected.includes(d)} 
								disabled={disabled} />
							<span className="label-body">{d}</span>
						</label>
						);
				})}
			</div>
		);
	}
}
