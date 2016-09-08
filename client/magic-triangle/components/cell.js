import React          from "react";
import TernaryPlot    from "./ternary-plot";
import Slider         from "./slider";
import DescriptorList from "./descriptor-list";

const ComponentWithDefaultSelected = component => props => {
	let descriptors;
	// If there is no selection, and there are exactly three descriptors to choose from
	if (!props.selected.length && (descriptors = Object.keys(props.context).filter(label => label != "__description")).length === 3)
		return component({...props, selected: descriptors});

	// Otherwise invoke the component without modifying props
	return component(props);
};

const StatelessCell = props => {
	const can_have_children = props.selected.some(label => props.context[label]);

	const plot_label = name => {
		if (!props.context[name])
			return name;
		else
		if (props.children.length && props.children[0].title === name)
			return <a className="selected" href="#" onClick={e => props.onRemoveClick(e, props.children[0].id)}>{name}</a>;
		else
			return <a href="#" onClick={e => props.onLabelClick(e, name)}>{name}</a>;
	};

	const derived_step = (severity, ratios) =>
		typeof severity === "undefined" && typeof ratios === "undefined" ? 0 : 1;

	const step = derived_step(props.severity, props.ratios);

	const button_label = num_selected =>
		num_selected === 3 ? "Next" : `Choose ${3 - num_selected} more`;

	return (
		<div className="mt-cell">
			{props.title &&
				<h3><span className="selected">{props.title}</span></h3>}
			{step === 0 &&
				<div>
					<p>{"Pick three things to compare" + (props.context.__description || "") + "."}</p>
					<DescriptorList items={Object.keys(props.context).filter(name => name != "__description")}
						selected={props.selected}
						onSelection={selected => props.onChange({selected})} />
					<button disabled={props.selected.length != 3}
						onClick={_ => props.onChange({severity: 0.5, ratios:[0.3333, 0.3333, 0.3333], selected:props.selected})}>
						{button_label(props.selected.length)}
					</button>
				</div>}
			{step === 1 &&
				<div>
					<TernaryPlot values={props.ratios} labels={props.selected.map(plot_label)}
						onChange={ratios => props.onChange({ratios})} />
					<Slider value={props.severity}
						onChange={severity => props.onChange({severity})} />
				</div>}
			{step === 1 && can_have_children &&
				<p><button onClick={props.onCopyClick}>Copy this triangle</button>&nbsp;</p>}
		</div>
	);
};

StatelessCell.PropTypes = {
	children:      React.PropTypes.array,
	title:         React.PropTypes.string,
	context:       React.PropTypes.object.isRequired,
	selected:      React.PropTypes.arrayOf(React.PropTypes.string),
	ratios:        React.PropTypes.arrayOf(React.PropTypes.number),
	severity:      React.PropTypes.number,
	onChange:      React.PropTypes.func.isRequired,
	onCopyClick:   React.PropTypes.func.isRequired,
	onLabelClick:  React.PropTypes.func.isRequired,
	onRemoveClick: React.PropTypes.func.isRequired,
};

const Cell = ComponentWithDefaultSelected(StatelessCell);
Cell.PropTypes = StatelessCell.PropTypes;

export default Cell;
