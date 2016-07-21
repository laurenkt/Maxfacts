var React = require('react');
var ReactDOM = require('react-dom');
var TernaryPlot = require('./ternaryplot.jsx');
var Slider = require('./slider.jsx');

class MagicTriangle extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div>
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
