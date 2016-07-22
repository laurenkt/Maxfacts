var React = require('react');
var ReactDOM = require('react-dom');
var TernaryPlot = require('./ternaryplot.jsx');
var Slider = require('./slider.jsx');

class MagicTriangle extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		// Determine how many rows to have with three columns
		var rows = Math.ceil(this.props.descriptors.length / 3);
		var desc = Array.from(Array(rows).keys()).map((r) => {
			var columns = this.props.descriptors.sort().slice(r * 3, (r+1)*3).map((d) => (
				<div key={d} className="one-third column">
					<label><input type="checkbox" /><span className="label-body">{d}</span></label>
				</div>
			));
			return <div key={r} className="row">{columns}</div>
		});

		return (
			<div>
				<div>{desc}</div>
				<TernaryPlot />
				<Slider />
			</div>
		);
	}
}

var descriptors = ["Kitchen", "Room", "Bathroom", "Noisiness",
				   "Carpet squidginess", "Temperature"];
document.addEventListener("DOMContentLoaded", (e) =>
	ReactDOM.render(<MagicTriangle descriptors={descriptors} />, document.getElementById('magicTriangle')));
