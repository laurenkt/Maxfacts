var React = require('react');
var ReactDOM = require('react-dom');

class TernaryPlot extends React.Component {
	constructor() {
		super();

		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp   = this.onMouseUp.bind(this);

		this.bounds = {height: 174, width: 200};
		this.state = {a: 0.3333, b: 0.3333, c: 0.3333};
	}

	render() {
		// Need to calculate where to position the marker based on properties of the
		// triangle
		var a = {x: this.bounds.width / 2, y: 0};
		var b = {x: 0, y: this.bounds.height};
		var c = {x: this.bounds.width, y: this.bounds.height};

		// Point where extended B value-line intersects BC 
		var z = {x: (1.0 - this.state.b) * c.x, y: b.y};

		// Gradient is same as line AC
		// gradient = (c.y/(c.x - a.x)) * X;
		// But offset is relative to Z
		// y - z.y == (c.y/(c.x - a.x))*(X - z.x)
		// We know that the y value is proportional to A
		var p = {y: (1.0 - this.state.a) * this.bounds.height};
		p.x = (p.y - z.y) / (c.y / (c.x - a.x)) + z.x;

		var markerStyles = {top: p.y, left: p.x}

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
		function distance(p1, p2) {
			return Math.sqrt(
				Math.pow(p1.x - p2.x, 2) +
				Math.pow(p1.y - p2.y, 2)
			);
		}

		// Get relative coordinates
		var bounds = this.refs.plot.getBoundingClientRect();
		var width  = this.refs.plot.clientWidth;
		var height = this.refs.plot.clientHeight;

		var x = e.clientX - bounds.left;
		var y = e.clientY - bounds.top;

		var mouse = {x: e.clientX - bounds.left, y: e.clientY - bounds.top};

		// Check that within bounds of equilateral triangle
		if (!this.withinTriangle(width, mouse.x, mouse.y))
			return;

		var a = {x: width / 2, y: 0};
		var b = {x: 0, y: height};
		var c = {x: width, y: height};

		// Solve distance BX
		// eq1: Y == ((y - b_y)/x)*X + b_y
		// console.log('BX: y = ' + ((mouse.y - b.y)/mouse.x) + 'x + ' + b.y);
		// Solve distance AC
		// eq2: Y == (c_y/(c_x - a_x))*X - c_y;
		// console.log('AC: y = ' + (c.y/(c.x - a.x)) + 'x - ' + c.y);

		// Find line of intersection
		// eq1 - eq2
		var i = {x: (b.y + c.y) / ( (c.y/(c.x - a.x)) - (y - b.y)/x )};
		i.y = ((mouse.y - b.y)/mouse.x) * i.x + b.y;
		// console.log('Intersection: (' + i.x + ', ' + i.y + ')');

		var val_a = 1.0 - y/height;
		var val_b = 1.0 - distance(b, mouse) / distance(b, i);
		var val_c = 1.0 - val_a - val_b;
		
		console.log(Math.round(val_a * 100) + '% ' + Math.round(val_b * 100) + '% ' + Math.round(val_c * 100) + '%');

		this.setState({
			a: val_a,
			b: val_b,
			c: val_c
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
