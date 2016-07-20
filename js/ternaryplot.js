(function($) {
	class TernaryPlot {
		constructor() {
			this.$root     = $('<div class="-tp" />');
			this.$triangle = $('<div class="-tp-plot" />').appendTo(this.$root);
			this.$marker   = $('<div class="-tp-marker" />').appendTo(this.$triangle);
			this.$labels   = $('<div class="-tp-labels" />').appendTo(this.$triangle);

			this.$triangle.bind('mousedown.tp', this.onMouseDown.bind(this));
		}

		addLabels(labelA, labelB, labelC) {
			labelA.wrap('<p class="-tp-label-a"></p>').parent().appendTo(this.$labels);
			labelB.wrap('<p class="-tp-label-b"></p>').parent().appendTo(this.$labels);
			labelC.wrap('<p class="-tp-label-c"></p>').parent().appendTo(this.$labels);
		}

		onMouseDown(e) {
			// Capture the mouse events
			$(document)
				.bind('mousemove.tp', this.onMouseMove.bind(this))
				.bind('mouseup.tp', this.onMouseUp.bind(this));

			// Treat this event like a normal mouse move
			this.onMouseMove(e);

			// Prevent the browser from treating this like a normal click
			e.preventDefault();
		}

		onMouseMove(e) {
			// Get cursor position
			var x = e.pageX - this.$triangle.offset().left;
			var y = e.pageY - this.$triangle.offset().top;

			// Check that within bounds of equilateral triangle
			if (!this.withinTriangle(this.$triangle.width(), x, y))
				return;
			
			// Set new position
			this.$marker
				.show()
				.css('left', x - this.$marker.width()/2)
				.css('top', y - this.$marker.height()/2);

			var distance_a = Math.sqrt(Math.pow(y, 2) + Math.pow(this.$triangle.width()/2 - x, 2));
			var distance_b = Math.sqrt(Math.pow(this.$triangle.height()-y, 2) + Math.pow(x, 2));
			var distance_c = Math.sqrt(Math.pow(this.$triangle.height()-y, 2) + Math.pow(this.$triangle.width()-x, 2));

			var total = distance_a + distance_b + distance_c;

			this.a = Math.round(100 - distance_a*200.0/total);
			this.b = Math.round(100 - distance_b*200.0/total);
			this.c = Math.round(100 - distance_c*200.0/total);

		}

		onMouseUp(e) {
			$(document)
				.unbind('mousemove.tp')
				.unbind('mouseup.tp');

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

	$.fn.ternaryPlot = function() {
		this.each(function(_, node) {
			node.ternaryPlot = new TernaryPlot();
			$(node).append(node.ternaryPlot.$root);
		});

		return this;
	}

} (jQuery));
