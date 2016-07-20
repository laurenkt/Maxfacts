(function($) {

	class Slider {
		constructor() {
			this.$root   = $('<div class="-slider" />');
			this.$slider = $('<div class="-slider-background" />').appendTo(this.$root);
			this.$marker = $('<div class="-slider-marker" />').appendTo(this.$slider)
			this.$labels = $('<div class="-slider-labels"><p class="-slider-label-left">Not a problem</p><p class="-slider-label-right">Seriously a problem</p></div>').appendTo(this.$slider);

			this.$slider.bind('mousedown.slider', this.onMouseDown.bind(this));

			this.value = 50;
		}

		// Set a value on the user interface (0-100)
		setValue(val) {
			if (val < 0)   val = 0;
			if (val > 100) val = 100;

			this.value = val;
			this.redraw();
		}

		onMouseDown(e) {
			// Capture the mouse events
			$(document)
				.bind('mousemove.slider', this.onMouseMove.bind(this))
				.bind('mouseup.slider', this.onMouseUp.bind(this));

			// Treat this event like a normal mouse move
			this.onMouseMove(e);

			// Prevent the browser from treating this like a normal click
			e.preventDefault();
		}

		onMouseMove(e) {
			// Get cursor position
			var x = e.pageX - this.$slider.offset().left;
			var y = e.pageY - this.$slider.offset().top;

			// Check within bounds of slider
			if (x < 0)
				x = 0;
			else if (x > this.$slider.width())
				x = this.$slider.width();
			
			// Set new position
			this.value = Math.round(x*100.0 / this.$slider.width());
			this.redraw();
		}

		onMouseUp(e) {
			$(document)
				.unbind('mousemove.slider')
				.unbind('mouseup.slider');

			e.preventDefault();
		}

		redraw() {
			this.$marker
				.show()
				.css('left', (this.value/100.0) * this.$slider.width() - this.$marker.width()/2)
				.css('top', -20);
		}
	}

	$.fn.slider = function() {
		this.each(function(_, node) {
			node.slider = new Slider();
			$(node).append(node.slider.$root);
			node.slider.redraw();
		});

		return this;
	}

} (jQuery));
