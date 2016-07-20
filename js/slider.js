var React = require('react');
var ReactDOM = require('react-dom');

class Slider extends React.Component {
	constructor() {
		super();

		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseUp   = this.onMouseUp.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);

		this.state = {value: 0};
		this.width = 200;
	}

	render() {
		var markerStyles = {
			top: '-20px',
			left: (this.state.value/100.0) * this.width
		}

		return (
			<div className="-slider">
				<div ref="slider" className="-slider-background" onMouseDown={this.onMouseDown}>
					<div className="-slider-marker" style={markerStyles} />
					<div className="-slider-labels">
						<p className="-slider-label-left">Not a problem</p>
						<p className="-slider-label-right">Seriously a problem</p>
					</div>
				</div>
			</div>
		);
	}

	componentDidMount() {
		// Get the bounds of the slider
		var bounds = this.refs.slider.getBoundingClientRect();
		this.width = bounds.right - bounds.left;
	}

	onMouseDown(e) {
		// Capture the mouse events
		document.addEventListener('mousemove', this.onMouseMove);
		document.addEventListener('mouseup', this.onMouseUp);

		// Treat this event like a normal mouse move
		this.onMouseMove(e);

		// Prevent the browser from treating this like a normal click
		e.preventDefault();
	}

	onMouseMove(e) {
		// Get relative coordinates
		var bounds = this.refs.slider.getBoundingClientRect();
		var width  = this.refs.slider.clientWidth;

		var x = e.clientX - bounds.left;

		// Check within bounds of slider
		if (x < 0)
			x = 0;
		else if (x > width)
			x = width;
		
		// Set new position
		this.setState({value: Math.round(x*100.0 / width)});
	}

	onMouseUp(e) {
		document.removeEventListener('mousemove', this.onMouseMove);
		document.removeEventListener('mouseup', this.onMouseUp);

		e.preventDefault();
	}
}

document.addEventListener("DOMContentLoaded", (e) =>
	ReactDOM.render(<Slider />, document.getElementById('slider')));
