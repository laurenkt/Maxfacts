var React = require('react');
var ReactDOM = require('react-dom');

module.exports = class TernaryPlot extends React.Component {
	constructor() {
		super();

		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp   = this.onMouseUp.bind(this);

		this.state = {a: 0.3333, b: 0.3333, c: 0.3333, height:0};
	}

	render() {
		// Need to calculate where to position the marker based on properties of a
		// triangle
		var a = {x: 100 / 2, y: 0};
		var b = {x: 0, y: 87};
		var c = {x: 100, y: 87};

		// Point where extended B value-line intersects BC 
		var z = {x: (1.0 - this.state.b) * c.x, y: b.y};

		// Gradient is same as line AC
		// gradient = (c.y/(c.x - a.x)) * X;
		// But offset is relative to Z
		// y - z.y == (c.y/(c.x - a.x))*(X - z.x)
		// We know that the y value is proportional to A
		var p = {y: (1.0 - this.state.a) * 87};
		p.x = (p.y - z.y) / (c.y / (c.x - a.x)) + z.x;

		var markerStyles = {
			top: ((1.0 - this.state.a) * 100.0) + '%',
			left: (p.x) + '%'}

		var plotStyles = {};

		if (this.state.height != 0) {
			plotStyles.height = this.state.height + 'px';
		}

		return (
			<div className="-tp">
				<div ref="plot" style={plotStyles} className="-tp-plot" onMouseDown={this.onMouseDown}>
					<div className="-tp-marker" style={markerStyles}></div>
					<div className="-tp-labels"></div>
				</div>
			</div>
		);
	}

	/*
		addLabels(labelA, labelB, labelC) {
			labelA.wrap('<p class="-tp-label-a"></p>').parent().appendTo(this.$labels);
			labelB.wrap('<p class="-tp-label-b"></p>').parent().appendTo(this.$labels);
			labelC.wrap('<p class="-tp-label-c"></p>').parent().appendTo(this.$labels);
		}*/


	componentDidMount() {
		var updateWidth = () => this.setState({height: this.refs.plot.offsetWidth*0.87});
		window.addEventListener('resize', updateWidth);
		updateWidth();
	}

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

		var mouse = {x: e.clientX - bounds.left, y: e.clientY - bounds.top};

		var a = {x: width / 2, y: 0};
		var b = {x: 0, y: height};
		var c = {x: width, y: height};

		// Check that within bounds of equilateral triangle
		if (!this.withinTriangle(width, height, mouse)) {
			// It's out of bounds so we need to extrapolate the nearest position
			// within the triangle

			// First cap the bottom as its simplest - one axis
			if (mouse.y > height)
				mouse.y = height;
			if (mouse.y < 0) 
				mouse.y = 0;

			// Is it still out of bounds?
			if (!this.withinTriangle(width, height, mouse)) {
				if ((mouse.x - width/2) < 0) {
					// Find intersection with AB
					var i = {x: (a.x*b.y*c.x - a.x*b.y*mouse.x - a.x*c.x*mouse.y + a.x*c.y*mouse.x)/(a.x*c.y + b.y*c.x - a.x*mouse.y - b.y*mouse.x)};
					i.y = (-b.y)/a.x * i.x + b.y;;
					mouse = i;
				}
				else {
					// Find intersection with AC
					// y == (c.y/(c.x - a.x))*X - c.y
					// BX: y == ((mouse.y - b.y)/mouse.x)*X + b.y
					var i = {x: (b.y + c.y) / ( (c.y/(c.x - a.x)) - (mouse.y - b.y)/mouse.x )};
					i.y   = ((mouse.y - b.y)/mouse.x) * i.x + b.y;
					mouse = i;
				}
			}
		}

		// BX: Y == ((y - b_y)/x)*X + b_y
		// AC: Y == (c_y/(c_x - a_x))*X - c_y;

		// Find point of intersection of BX and AC
		// by simultaneous equations, which will allow us to find |BX|
		var i = {x: (b.y + c.y) / ( (c.y/(c.x - a.x)) - (mouse.y - b.y)/mouse.x )};
		i.y   = ((mouse.y - b.y)/mouse.x) * i.x + b.y;

		var val_a = 1.0 - mouse.y/height;
		var val_b = 1.0 - distance(b, mouse) / distance(b, i);

		this.setState({
			a: val_a,
			b: val_b,
			c: 1.0 - val_a - val_b
		});

		e.preventDefault();
	}

	withinTriangle(width, height, point) {
		// Validation function, checks within 0-60 degrees
		function acceptable(angle) {
			return (angle >= 0 && angle <= Math.PI/3);
		};

		// Basic sanity checks
		if (point.x < 0 || point.x > width || point.y < 0 || point.y > height)
			return false;

		// Now check angles
		return (
			// angle from A
			acceptable(Math.atan((height - point.y) / point.x)) &&
			// angle from C
			acceptable(Math.atan((height - point.y) / (width-point.x)))
		);
	}
}
