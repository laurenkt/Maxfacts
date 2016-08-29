import React          from "react";
import TernaryPlot    from "./ternary-plot";
import Slider         from "./slider";
import DescriptorList from "./descriptor-list";
import {keys}         from "lodash";

export default class Cell extends React.Component {
	constructor(props) {
		super(props);

		this.descriptors = keys(props.context);

		this.state = {
			selected: this.descriptors.length == 3 ? this.descriptors : (props.selected || []),
			ratios:   props.ratios   || undefined,
			severity: props.severity || undefined,
			title:    props.title    || String.fromCodePoint(0x00A0), // non-breaking space
		};
	}

	static get propTypes() {
		return {
			title:         React.PropTypes.string,
			context:       React.PropTypes.object.isRequired,
			selected:      React.PropTypes.arrayOf(React.PropTypes.string),
			ratios:        React.PropTypes.arrayOf(React.PropTypes.number),
			severity:      React.PropTypes.number,
			onChange:      React.PropTypes.func.isRequired,
			onLabelClick:  React.PropTypes.func.isRequired,
			onRemoveClick: React.PropTypes.func.isRequired,
		};
	}

	render() {
		const derived_step = () =>
			typeof this.props.severity === "undefined" && typeof this.props.ratios === "undefined" ? 0 : 1;

		const button_label = (num_remaining = 3 - this.props.selected.length) =>
			num_remaining === 0 ? "Next" : `Choose ${num_remaining} more`;

		const plot_label = name => {
			if (!this.props.context[name])
				return name;
			else
				return <a href="#" onClick={e => this.props.onLabelClick(e, name)}>{name}</a>;
		};

		return (
			<div className="mt-cell">
				<h3>
					{this.props.title || String.fromCodePoint(0x00A0)}
					{this.props.title && <a href="#" onClick={this.props.onRemoveClick}>&#x2715;</a>}
				</h3>
				{derived_step() === 0 &&
					<div>
						<p>Pick <strong>three</strong> categories to compare.</p>
						<DescriptorList items={this.descriptors} selected={this.props.selected}
							onSelection={selected => this.props.onChange({selected})} />
						<button disabled={this.props.selected.length != 3}
							onClick={_ => this.props.onChange({severity: 0.5, ratios:[0.3333, 0.3333, 0.3333]})}>{button_label()}</button>
					</div>}
				{derived_step() === 1 &&
					<div>
						<TernaryPlot values={this.props.ratios} labels={this.props.selected.map(plot_label)}
							onChange={ratios => this.props.onChange({ratios})} />
						<Slider value={this.props.severity}
							onChange={severity => this.props.onChange({severity})} />
					</div>}
			</div>
		);
	}
}
