var React = require('react');
var ReactDOM = require('react-dom');
var TernaryPlot = require('./ternaryplot.jsx');
var Slider = require('./slider.jsx');

class MagicTriangle extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			step: 0,
			selected: []
		};

		this.processNextStep = this.processNextStep.bind(this);
	}

	onDescriptorChange(descriptor, e) {
		if (e.target.checked) {
			this.setState({selected: this.state.selected.concat([descriptor])});
		}
		else
			this.setState({selected: this.state.selected.filter((d) => d != descriptor)});
	}

	processNextStep(e) {
		if (this.state.step == 0) {
			if (this.state.selected.length == 3) {
				this.setState({step: 1});
			}
		}
	}

	render() {
		// Should non-selected descriptors be disabled?
		var disabled = "";
		if (this.state.selected.length >= 3) disabled = "disabled";

		// Determine how many rows to have with three columns
		var rows = Math.ceil(this.props.descriptors.length / 3);
		var desc = Array.from(Array(rows).keys()).map((r) => {
			var columns = this.props.descriptors.sort().slice(r * 3, (r+1)*3).map((d) => {
				// Should this descriptor be disabled
				var disabled = "disabled";
				if (this.state.selected.includes(d) || this.state.selected.length < 3)
					disabled = "";

				return (
					<label key={d} className={disabled}>
						<input type="checkbox" onChange={this.onDescriptorChange.bind(this, d)} disabled={disabled} />
						<span className="label-body">{d}</span>
					</label>
				)
			});
			return <div key={r} className="row">{columns}</div>
		});

		if (this.state.step == 0) {
			var remainingDescriptors = 3 - this.state.selected.length;
			var label = 'Next';
			var disabled = "";

			if (remainingDescriptors > 0) {
				disabled = "disabled";
				if (remainingDescriptors > 1) {
					label = 'Choose ' + remainingDescriptors + ' more items';
				}
				else {
					label = 'Choose 1 more item';
				}
			}

			return (
				<div>
					<h2>Step 1</h2>
					<p>Choose <strong>three</strong> things that make your accomodation miserable.</p>
					<div>{desc}</div>
					<button disabled={disabled} onClick={this.processNextStep}>{label}</button>
				</div>
			);
		}
		else
		if (this.state.step == 1) {
			return (
				<div>
					<h2>Step 2</h2>
					<p>Move the circle in the triangle to describe the relative misery of the three descriptors i.e. move the circle closest to B if B makes you the most miserable.</p>
					<TernaryPlot />
					<button>Next</button>
				</div>
			);
		}

		return <div></div>;
	}
}

var descriptors = ["Kitchen", "Room", "Bathroom", "Noisiness",
				   "Carpet squidginess", "Temperature"];
document.addEventListener("DOMContentLoaded", (e) =>
	ReactDOM.render(<MagicTriangle descriptors={descriptors} />, document.getElementById('magicTriangle')));
