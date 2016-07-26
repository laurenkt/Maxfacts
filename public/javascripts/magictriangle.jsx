var React = require('react');
var ReactDOM = require('react-dom');
var TernaryPlot = require('./ternaryplot.jsx');
var Slider = require('./slider.jsx');

class MagicTriangle extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			step: 0,
			selected: [],
			a: 0.3333,
			b: 0.3333,
			c: 0.3333,
			value: 0.5
		};

		this.plot = {};
		this.slider = {};
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
		else
		if (this.state.step == 1) {
			this.setState({
				step: 2,
				a: this.plot.state.a,
				b: this.plot.state.b,
				c: this.plot.state.c
			});	
		}
		else
		if (this.state.step == 2) {
			this.setState({
				step: 3,
				value: this.slider.state.value
			});
		}
	}

	callbackChangeToStep(stepNo) {
		return (e) => {
			this.setState({step: stepNo});
			e.preventDefault();
			return false;
		};
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

				var checked = "";
				if (this.state.selected.includes(d)) checked="checked";

				return (
					<label key={d} className={disabled}>
						<input type="checkbox" onChange={this.onDescriptorChange.bind(this, d)} checked={checked} disabled={disabled} />
						<span ref={'label_' + d} className="label-body">{d}</span>
					</label>
				)
			});
			return <div key={r} className="checkboxes">{columns}</div>
		});

		if (this.state.step == 0) {
			var remainingDescriptors = 3 - this.state.selected.length;
			var label = 'Next';
			var disabled = "";

			if (remainingDescriptors > 0) {
				disabled = "disabled";
				if (remainingDescriptors > 1)
					label = 'Choose ' + remainingDescriptors + ' more items';
				else 
					label = 'Choose 1 more item';
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
			// Sort the selected items
			var sorted = this.state.selected.sort();

			return (
				<div>
					<p className="completed"><strong>Step 1</strong> (completed) &mdash; {sorted.join(', ')} &mdash; <a href="#" onClick={this.callbackChangeToStep(0)}>Edit</a></p>
					<h2>Step 2</h2>
					<p>Move the circle in the triangle to describe the relative misery of the three descriptors i.e. move the circle closest to B if B makes you the most miserable.</p>
					<TernaryPlot ref={(plot) => this.plot = plot} a={this.state.a} b={this.state.b} c={this.state.c} labela={sorted[0]} labelb={sorted[1]} labelc={sorted[2]} />
					<button onClick={this.processNextStep}>Next</button>
				</div>
			);
		}
		else
		if (this.state.step == 2) {
			// Sort the selected items
			var sorted = this.state.selected.sort();

			return (
				<div>
					<p className="completed"><strong>Step 1</strong> (completed) &mdash; {sorted.join(', ')} &mdash; <a href="#" onClick={this.callbackChangeToStep(0)}>Edit</a></p>
					<p className="completed"><strong>Step 2</strong> (completed) &mdash; <a href="#" onClick={this.callbackChangeToStep(1)}>Edit</a>
						<TernaryPlot disabled a={this.state.a} b={this.state.b} c={this.state.c} labela={sorted[0]} labelb={sorted[1]} labelc={sorted[2]} />
					</p>
					<h2>Step 3</h2>
					<p>Adjust the slider to describe the severity of the problem.</p>
					<Slider ref={(slider) => this.slider = slider} value={this.state.value} />
					<button onClick={this.processNextStep}>Next</button>
				</div>
			);
		}
		else
		if (this.state.step == 3) {
			// Sort the selected items
			var sorted = this.state.selected.sort();

			return (
				<div>
					<p className="completed"><strong>Step 1</strong> (completed) &mdash; {sorted.join(', ')} &mdash; <a href="#" onClick={this.callbackChangeToStep(0)}>Edit</a></p>
					<p className="completed"><strong>Step 2</strong> (completed) &mdash; <a href="#" onClick={this.callbackChangeToStep(1)}>Edit</a>
						<TernaryPlot disabled a={this.state.a} b={this.state.b} c={this.state.c} labela={sorted[0]} labelb={sorted[1]} labelc={sorted[2]} />
					</p>
					<p className="completed"><strong>Step 3</strong> (completed) &mdash; <a href="#" onClick={this.callbackChangeToStep(2)}>Edit</a>
						<Slider disabled value={this.state.value} nolabels />
					</p>
					<h2>Summary</h2>
					<table>
						<tbody>
							<tr><th colSpan="3">Level 1</th></tr>
							<tr>
								<td>{sorted[0]}: {Math.round(this.state.a * 100.0)}%</td>
								<td>{sorted[1]}: {Math.round(this.state.b * 100.0)}%</td>
								<td>{sorted[2]}: {Math.round(this.state.c * 100.0)}%</td>
							</tr>
							<tr>
								<td colSpan="3">Overall severity: {Math.round(this.state.value * 100.0)}%</td>
							</tr>
						</tbody>
					</table>
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
