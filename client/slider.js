import React from 'react';

module.exports = class Slider extends React.Component {
	constructor(props) {
		super(props);

		// These need to be bound here rather than in-line, so that document.removeEventListener
		// can be passed a direct reference to the event listeners
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseUp   = this.onMouseUp.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);

		this.state = {
			// Number from 0 to 1 representing the slider value
			value: props.value
		};
	}

	static get propTypes() {
		return {
			// Default slider value (0-1)
			value:    React.PropTypes.number,
			// Callback function when value changes
			onChange: React.PropTypes.func,
			// Whether to draw labels
			nolabels: React.PropTypes.bool,
			// Whether the slider is disabled
			disabled: React.PropTypes.bool
		};
	}

	static get defaultProps() {
		return {
			// Right in the middle
			value: 0.5
		};
	}

	computeWeight(value) {
		return {
			fontWeight: (300 + Math.round(value * 4.0) * 100),
			fontSize:   (90 + value * 30.0) + '%',
			opacity:    (50 + Math.round(value * 50.0)) + '%'
		};
	}

	renderLabels() {
		function computeWeight(value) {
			return {
				fontWeight: (300 + Math.round(value * 4.0) * 100),
				fontSize:   (90 + value * 30.0) + '%',
				opacity:    (50 + Math.round(value * 50.0)) + '%'
			};
		}

		return (
			<div className="-slider-labels">
				<p style={computeWeight(1.0 - this.state.value)}
					className="-slider-label-left">Not a problem</p>
				<p style={computeWeight(this.state.value)}
					className="-slider-label-right">Seriously a problem</p>
			</div>
		);
	}

	render() {

		return (
			<div className="-slider">
				<div ref="slider" className="-slider-background" onMouseDown={this.onMouseDown}>
					<div className="-slider-marker" style={{left: (this.state.value*100.0) + '%'}} />
					{// Only render labels if props.nolabels is not set
						!this.props.nolabels &&
							this.renderLabels()
					}
				</div>
			</div>
		);
	}

	onMouseDown(e) {
		// Prevent the browser from treating this like a normal click
		e.preventDefault();

		// Only deal with the event if the element isn't disabled
		if (this.props.disabled)
			return;

		// We are effectively in 'drag' mode now, so capture the relevant mouse events
		document.addEventListener('mousemove', this.onMouseMove);
		document.addEventListener('mouseup',   this.onMouseUp);

		// Process the event like a normal mouse move (to begin dragging)
		this.onMouseMove(e);
	}

	onMouseMove(e) {
		// Get relative coordinates
		var bounds = this.refs.slider.getBoundingClientRect();
		var width  = this.refs.slider.clientWidth;

		// Mouse x position relative to the slider bounds
		var x = e.clientX - bounds.left;

		// Check within bounds of slider
		if (x < 0)
			x = 0;
		else if (x > width)
			x = width;

		// Set new position
		this.setState({value: x / width});

		// Propogate callback to parent
		if (this.props.onChange)
			this.props.onChange(x / width);
	}

	onMouseUp(e) {
		// Cancel normal browser mouse behaviour
		e.preventDefault();

		// Don't need to listen to these events again until another mouse down
		document.removeEventListener('mousemove', this.onMouseMove);
		document.removeEventListener('mouseup',   this.onMouseUp);
	}
}
