import React  from "react";
import {omit} from "lodash";

export default class TernaryPlot extends React.Component {
	constructor(props) {
		super(props);

		// These need to be bound here rather than in-line, so that document.removeEventListener
		// can be passed a direct reference to the event listeners
		this.onMouseDown     = this.onMouseDown.bind(this);
		this.onMouseMove     = this.onMouseMove.bind(this);
		this.onMouseUp       = this.onMouseUp.bind(this);

		this.state = {
			// A, B, and C values corresponding to the three points of the triangle
			a: props.values[0],
			b: props.values[1],
			c: props.values[2],
		};

		this._plotDom = null;
	}

	static get propTypes() {
		return {
			// Initial magnitudes of A, B, and C (adds up to 1.0)
			values:   React.PropTypes.arrayOf(React.PropTypes.number),
			// An array of three string labels (required)
			labels:   React.PropTypes.arrayOf(React.PropTypes.string).isRequired,
			// Callback for the parent component
			onChange: React.PropTypes.func,
			// If present, component cannot be edited
			disabled: React.PropTypes.bool,
			// The extent to highlight the marker
			severity: React.PropTypes.number,
		};
	}

	static get defaultProps() {
		return {
			// Dead centre
			values: [0.3333, 0.3333, 0.3333],
			severity: 1.0,
		};
	}

	computeWeight(value) {
		return {
			fontWeight: (300 + Math.round(value * 4.0) * 100),
			fontSize:   `${90 + value*30.0}%`,
			opacity:    (0.5 + (value * 0.5)),
		};
	}

	markerPositionFromState() {
		// Need to calculate where to position the marker based on properties of a
		// triangle
		// We will use a conceptual triangle with edge length of 100, and then
		// our results will be percentages which can be mapped to the actual
		// triangle.

		// The coordinates of the points A, B and C (the corners of the triangle)
		var A = {x: 100 / 2, y: 0};
		var B = {x: 0,       y: 86.6025};
		var C = {x: 100,     y: 86.6025};

		// Point P is where the marker should be
		// We know that the y value is proportional only to the amount of a and independent of b/c
		var P = {x: NaN, y: (1.0 - this.state.a) * 86.6025};

		// To find the x coordinate we need to consider the relationship between b and c
		// Point where extended B value-line intersects BC
		var Z = {x: (1.0 - this.state.b) * C.x, y: B.y};
		// The B value-line has the same gradient as AC
		// gradient(AC) = (c.y/(c.x - a.x)) * X;
		// Use Z as coordinate on this line, and combine with gradient for eqn of line
		// y - z.y == (c.y/(c.x - a.x))*(X - z.x)
		P.x = (P.y - Z.y) / (C.y / (C.x - A.x)) + Z.x;

		return P;
	}

	render() {
		var P = this.markerPositionFromState();

		var plotStyles = {};

		if (this._plotDom) {
			var offset = {
				top:   (1.0 - this.state.a) * this._plotDom.offsetHeight  - this._plotDom.offsetHeight,
				left: ((P.x/100.0) * 1.1494 * this._plotDom.offsetHeight) - this._plotDom.offsetHeight * 1.1494,
			};

			// CSS to adjust the position of the gradient
			plotStyles = {
				backgroundPosition: `${offset.left}px ${offset.top}px, center`,
				cursor: this.props.disabled ? "not-allowed" : "auto",
			};
		}

		// Transfer unused props to container
		var other = omit(this.props, ["className", "severity", "labels", "values", "onChange"]);

		return (
			<div {...other} className={"-tp " + (this.props.className || "")}>
				<div className="-tp-labels">
					<p className="-tp-label-a" style={this.computeWeight(this.state.a)}>{this.props.labels[0]}</p>
					<p className="-tp-label-b" style={this.computeWeight(this.state.b)}>{this.props.labels[1]}</p>
					<p className="-tp-label-c" style={this.computeWeight(this.state.c)}>{this.props.labels[2]}</p>
				</div>
				<div ref={ref => this._plotDom = ref} style={plotStyles}
					className="-tp-plot" onMouseDown={this.onMouseDown}>
					<div className="-tp-marker" style={{top: `${P.y/0.866025}%`, left: `${P.x}%`, opacity: 0.3+(this.props.severity*0.7)}}></div>
				</div>
			</div>
		);
	}

	onMouseDown(e) {
		if (this.props.disabled)
			return;

		document.addEventListener("mousemove", this.onMouseMove);
		document.addEventListener("mouseup",   this.onMouseUp);

		this.onMouseMove(e);
	}

	onMouseUp(e) {
		e.preventDefault();

		document.removeEventListener("mousemove", this.onMouseMove);
		document.removeEventListener("mouseup",   this.onMouseUp);
	}

	static wrapPointWithinTriangle(point, width, height) {
		// Get actual coordinates of corners of the triangle
		var A = {x: width/2, y: 0};
		var B = {x: 0,       y: height};
		var C = {x: width,   y: height};

		// Check that within bounds of equilateral triangle
		if (!TernaryPlot.isPointWithinTriangle(point, width, height)) {
			// It's out of bounds so we need to extrapolate the nearest position
			// within the triangle

			// First cap the bottom as its simplest - one axis
			if (point.y > height)
				point.y = height;
			if (point.y < 0)
				point.y = 0;

			// Is it still out of bounds?
			if (!TernaryPlot.isPointWithinTriangle(point, width, height)) {
				// We want to clip the mouse to the edge of the triangle
				// This can be done by changing the mouse position to the point at which
				// a line (from the real mouse position to the opposite corner) intersects
				// with the edge of the triangle.
				// Intersection point
				var I = {x: NaN, y: NaN};

				// If it's on the left side
				if ((point.x - width/2) < 0) {
					// Find intersection with AB
					I.x = (A.x*B.y*C.x - A.x*B.y*point.x - A.x*C.x*point.y +
						A.x*C.y*point.x)/(A.x*C.y + B.y*C.x - A.x*point.y - B.y*point.x);
					I.y = (-B.y)/A.x * I.x + B.y;
				}
				// On the right side
				else {
					// Find intersection with AC
					// y == (c.y/(c.x - a.x))*X - c.y
					// BX: y == ((mouse.y - b.y)/mouse.x)*X + b.y
					I.x = (B.y + C.y) / ( (C.y/(C.x - A.x)) - (point.y - B.y)/point.x );
					I.y = ((point.y - B.y)/point.x) * I.x + B.y;
				}

				// Change the computed mouse position to the intersection point
				point = I;
			}
		}

		return point;
	}

	onMouseMove(e) {
		e.preventDefault();

		// If the component isn't mounted we can't derive coordinates from
		// its bounds - so don't continue
		if (!this._plotDom)
			return;

		// Get relative coordinates
		var bounds = this._plotDom.getBoundingClientRect();
		var width  = this._plotDom.clientWidth;
		var height = this._plotDom.clientHeight;

		// Mouse coordinates relative to the triangle
		var mouse = {x: e.clientX - bounds.left, y: e.clientY - bounds.top};
		// Wrap to the bounds of the triangle
		mouse = TernaryPlot.wrapPointWithinTriangle(mouse, width, height);

		// Get actual coordinates of corners of the triangle
		var A = {x: width/2, y: 0};
		var B = {x: 0,       y: height};
		var C = {x: width,   y: height};

		// To find the amount of B we want to find the point of intersection `I`
		// the line from B to the mouse, and AC. Then we can determine the amount of
		// B as a ratio of the distance from B to the mouse, to the distance |BI|
		var I = {x: NaN, y: NaN};

		// Find point of intersection of BX and AC
		// by simultaneous equations, which will allow us to find |BX|
		// BX: Y == ((y - b_y)/x)*X + b_y
		// AC: Y == (c_y/(c_x - a_x))*X - c_y;
		// The || 0 eats up NaN's
		I.x = ((B.y + C.y) / ( (C.y/(C.x - A.x)) - (mouse.y - B.y)/mouse.x) || 0 );
		I.y = (((mouse.y - B.y)/mouse.x) * I.x + B.y) || 0;

		// Function to determine the distance between two points
		function distance(p1, p2) {
			return Math.sqrt(
				Math.pow(p1.x - p2.x, 2) +
					Math.pow(p1.y - p2.y, 2)
			);
		}

		// The value of A is simply the proportion of the distance along the y-axis
		// B is |BX|/|BI|
		var values = {
			a: 1.0 - mouse.y/height,
			b: 1.0 - distance(B, mouse) / distance(B, I),
		};

		// C is whatever remains
		values.c = 1.0 - values.a - values.b;

		// Update the state
		this.setState(values);

		// Pass data to parent
		if (this.props.onChange)
			this.props.onChange([values.a, values.b, values.c]);
	}

	static isPointWithinTriangle(point, width, height) {
		// Validation function, checks within 0-60 degrees
		function acceptable(angle) {
			return (angle >= 0 && angle <= Math.PI/3);
		}

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
