import React          from "react";
import TernaryPlot    from "./ternary-plot";
import Slider         from "./slider";
import DescriptorList from "./descriptor-list";

const ComponentWithDefaultSelected = component => props => {
	// If there is no selection, and there are exactly three descriptors to choose from
	if (!props.selected.length && Object.keys(props.context).length === 3)
		return component({...props, selected: Object.keys(props.context)});

	// Otherwise invoke the component without modifying props
	return component(props);
};

const StatelessCell = props => {
	const plot_label = name => {
		if (!props.context[name])
			return name;
		else
			return <a href="#" onClick={e => props.onLabelClick(e, name)}>{name}</a>;
	};

	const derived_step = (severity, ratios) =>
		typeof severity === "undefined" && typeof ratios === "undefined" ? 0 : 1;

	const button_label = num_selected =>
		num_selected === 3 ? "Next" : `Choose ${3 - num_selected} more`;

	return (
		<div className="mt-cell">
			<h3>
				{props.title || String.fromCodePoint(0x00A0)}
				{props.title && <a href="#" onClick={props.onRemoveClick}>&#x2715;</a>}
			</h3>
			{derived_step(props.severity, props.ratios) === 0 &&
				<div>
					<p>Pick <strong>three</strong> categories to compare.</p>
					<DescriptorList items={Object.keys(props.context)}
						selected={props.selected}
						onSelection={selected => props.onChange({selected})} />
					<button disabled={props.selected.length != 3}
						onClick={_ => props.onChange({severity: 0.5, ratios:[0.3333, 0.3333, 0.3333], selected:props.selected})}>
						{button_label(props.selected.length)}
					</button>
				</div>}
			{derived_step(props.severity, props.ratios) === 1 &&
				<div>
					<TernaryPlot values={props.ratios} labels={props.selected.map(plot_label)}
						onChange={ratios => props.onChange({ratios})} />
					<Slider value={props.severity}
						onChange={severity => props.onChange({severity})} />
				</div>}
		</div>
	);
};

StatelessCell.PropTypes = {
	title:         React.PropTypes.string,
	context:       React.PropTypes.object.isRequired,
	selected:      React.PropTypes.arrayOf(React.PropTypes.string),
	ratios:        React.PropTypes.arrayOf(React.PropTypes.number),
	severity:      React.PropTypes.number,
	onChange:      React.PropTypes.func.isRequired,
	onLabelClick:  React.PropTypes.func.isRequired,
	onRemoveClick: React.PropTypes.func.isRequired,
};

const Cell = ComponentWithDefaultSelected(StatelessCell);
Cell.PropTypes = StatelessCell.PropTypes;

export default Cell;
