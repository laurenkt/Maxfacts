var React = require('react');
var ReactDOM = require('react-dom');

class TernaryPlot extends React.Component {
	constructor() {
		super();

		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp   = this.onMouseUp.bind(this);

		this.bounds = {height: 174, width: 200};
		this.state = {a: 33, b: 33, c: 33};
	}

	render() {
		var markerStyles = {
			top: ((100-this.state.a)/100.0) * this.bounds.height,
			left: (this.state.c / (this.state.b + this.state.c)) * this.bounds.width
		}

		return (
			<div className="-tp">
				<div ref="plot" className="-tp-plot" onMouseDown={this.onMouseDown}>
					<div className="-tp-marker" style={markerStyles}></div>
					<div className="-tp-labels"></div>
				</div>
			</div>
		);
	}

	componentDidMount() {
		// Get the bounds of the plot
		var bounds = this.refs.plot.getBoundingClientRect();
		this.bounds.width = bounds.right - bounds.left;
		this.bounds.height = bounds.bottom - bounds.top;
	}
	/*
		addLabels(labelA, labelB, labelC) {
			labelA.wrap('<p class="-tp-label-a"></p>').parent().appendTo(this.$labels);
			labelB.wrap('<p class="-tp-label-b"></p>').parent().appendTo(this.$labels);
			labelC.wrap('<p class="-tp-label-c"></p>').parent().appendTo(this.$labels);
		}*/

	onMouseDown(e) {
		document.addEventListener('mousemove', this.onMouseMove);
		document.addEventListener('mouseup', this.onMouseUp);

		e.preventDefault();
	}

	onMouseUp(e) {
		document.removeEventListener('mousemove', this.onMouseMove);
		document.removeEventListener('mouseup', this.onMouseUp);

		e.preventDefault();
	}

	onMouseMove(e) {
		// Get relative coordinates
		var plot_bounds = this.refs.plot.getBoundingClientRect();
		var plot_width  = this.refs.plot.clientWidth;
		var plot_height = this.refs.plot.clientHeight;

		var x = e.clientX - plot_bounds.left;
		var y = e.clientY - plot_bounds.top;

		// Check that within bounds of equilateral triangle
		if (!this.withinTriangle(plot_width, x, y))
			return;
		
		var distance_a = Math.sqrt(Math.pow(y, 2) + Math.pow(plot_width/2 - x, 2));
		var distance_b = Math.sqrt(Math.pow(plot_height-y, 2) + Math.pow(x, 2));
		var distance_c = Math.sqrt(Math.pow(plot_height-y, 2) + Math.pow(plot_width-x, 2));

		var total = distance_a + distance_b + distance_c;

		this.setState({
			a: Math.round(100 - distance_a*200.0/total),
			b: Math.round(100 - distance_b*200.0/total),
			c: Math.round(100 - distance_c*200.0/total)
		});

		e.preventDefault();
	}

	withinTriangle(edgeLength, x, y) {
		function area(x1, y1, x2, y2, x3, y3) {
			return Math.abs((x1*(y2-y3) + x2*(y3-y1)+ x3*(y1-y2))/2.0);
		}

		var x1 = 0, y1 = Math.sqrt(Math.pow(edgeLength, 2) - Math.pow(edgeLength/2, 2));
		var x2 = edgeLength, y2 = y1;
		var x3 = edgeLength/2, y3 = 0;

		var real_area = area(x1, y1, x2, y2, x3, y3);

		var a1 = area(x, y, x2, y2, x3, y3);
		var a2 = area(x1, y1, x, y, x3, y3);
		var a3 = area(x1, y1, x2, y2, x, y);
		
		return (real_area == (a1+a2+a3));
	}
}

document.addEventListener("DOMContentLoaded", (e) =>
	ReactDOM.render(<TernaryPlot />, document.getElementById('ternaryPlot')));
