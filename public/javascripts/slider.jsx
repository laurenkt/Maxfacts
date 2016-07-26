var React = require('react');
var ReactDOM = require('react-dom');

module.exports = class Slider extends React.Component {
	constructor(props) {
		super(props);

		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseUp   = this.onMouseUp.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);

		this.state = {value: props.value};
	}

	static get defaultProps() {
		return {value: 0.5};
	}

	render() {
		var labels = "";
		if (!this.props.nolabels) {
			labels = (
				<div className="-slider-labels">
					<p className="-slider-label-left">Not a problem</p>
					<p className="-slider-label-right">Seriously a problem</p>
				</div>
			);
		}

		return (
			<div className="-slider">
				<div ref="slider" className="-slider-background" onMouseDown={this.onMouseDown}>
					<div className="-slider-marker" style={{left: (this.state.value*100.0) + '%'}} />
					{labels}
				</div>
			</div>
		);
	}

	onMouseDown(e) {
		if (this.props.disabled) 
			return;

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
		this.setState({value: x / width});
	}

	onMouseUp(e) {
		document.removeEventListener('mousemove', this.onMouseMove);
		document.removeEventListener('mouseup', this.onMouseUp);

		e.preventDefault();
	}
}
