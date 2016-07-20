(function($) {
	class MagicSlider {
		constructor() {
			this.$root = $('<div class="magic-triangle-root" />');
			this.$slider = $('<div class="magic-triangle-slider" />').appendTo(this.$root);
			this.$marker = $('<div class="magic-triangle-slider-marker" />').appendTo(this.$slider)
			this.$descriptors = $('<div class="magic-triangle-slider-descriptors"><p class="left">Not a problem</p><p class="right">Seriously a problem</p></div>').appendTo(this.$slider);

			this.$slider.bind('mousedown.mt', this.onMouseDown.bind(this));
		}

		onMouseDown(e) {
			// Capture the mouse events
			$(document)
				.bind('mousemove.mt', this.onMouseMove.bind(this))
				.bind('mouseup.mt', this.onMouseUp.bind(this));

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
			this.$marker
				.show()
				.css('left', x - this.$marker.width()/2)
				.css('top', -20);

			this.percentage = Math.round(x*100.0 / this.$slider.width());
		}

		onMouseUp(e) {
			$(document)
				.unbind('mousemove.mt')
				.unbind('mouseup.mt');

			e.preventDefault();
		}
	}

	class MagicTriangle {
		constructor() {
			this.$root     = $('<div class="magic-triangle-root" />');
			this.$triangle = $('<div class="magic-triangle-input">').appendTo(this.$root);
			this.$marker   = $('<div class="magic-triangle-marker">').appendTo(this.$triangle);
			this.$descriptors = $('<div class="magic-triangle-descriptors" />').appendTo(this.$triangle);

			this.$triangle.bind('mousedown.mt', this.onMouseDown.bind(this));
		}

		addDescriptors(descA, descB, descC) {
			descA.wrap('<p class="magic-slider-desc-a"></p>').parent().appendTo(this.$descriptors);
			descB.wrap('<p class="magic-slider-desc-b"></p>').parent().appendTo(this.$descriptors);
			descC.wrap('<p class="magic-slider-desc-c"></p>').parent().appendTo(this.$descriptors);
		}

		onMouseDown(e) {
			// Capture the mouse events
			$(document)
				.bind('mousemove.mt', this.onMouseMove.bind(this))
				.bind('mouseup.mt', this.onMouseUp.bind(this));

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
				.unbind('mousemove.mt')
				.unbind('mouseup.mt');

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

	$.fn.magicTriangle = function() {
		this.each(function(_, node) {
			node.magicTriangle = new MagicTriangle();
			$(node).append(node.magicTriangle.$root);
		});

		return this;
	}

	$.fn.magicSlider = function() {
		this.each(function(_, node) {
			node.magicSlider = new MagicSlider();
			$(node).append(node.magicSlider.$root);
		});

		return this;
	}
}(jQuery));

$(function() {
	var descriptors = $('<ul class="magic-triangle-descriptor-box"><li><a href="#">Kitchen</a></li><li><a href="#">Room</a></li><li><a href="#">Bathroom</a></li><li><a href="#">Noisiness</a></li><li><a href="#">Carpet squidginess</a></li><li><a href="#">Temperature</a></li></ul>');

	descriptors.find('a').click(function(e) {
		$(descriptors.get(0).targetNode).text($(this).text());
		descriptors.detach();
		e.preventDefault();
	});

	var descA = $('<a href="#">Choose a descriptor</a>');
	var descB = $('<a href="#">Choose a descriptor</a>');
	var descC = $('<a href="#">Choose a descriptor</a>');

	descA.click(function (e) {
		$('body').append(descriptors);
		descriptors.get(0).targetNode = this;
		descriptors.offset({top: e.pageY, left: e.pageX });

		e.preventDefault();
	});

	descB.click(function (e) {
		$('body').append(descriptors);
		descriptors.get(0).targetNode = this;
		descriptors.offset({top: e.pageY, left: e.pageX });

		e.preventDefault();
	});

	descC.click(function (e) {
		$('body').append(descriptors);
		descriptors.get(0).targetNode = this;
		descriptors.offset({top: e.pageY, left: e.pageX });

		e.preventDefault();
	});

	$('div.mt')
		.magicTriangle()
		.magicSlider()
		.each(function (_, node) {
			node.magicTriangle.addDescriptors(descA, descB, descC);
		});

	var results = $('<p/>');
	
	$('button').click(function(e) {
		var triangle = $('div.mt').get(0).magicTriangle;
		var slider = $('div.mt').get(0).magicSlider;

		results.html('<strong>Ratio of problems:</strong><br>' + descA.text() + ': ' + triangle.a + '%<br>' + descB.text() + ': ' + triangle.b + '%<br>' + descC.text() + ': ' + triangle.c + '%<br><strong>Overall severity</strong>: ' + slider.percentage+ '%');
		$('.container').append(results);
	});
});


	/*
	slider.bind('mousedown.mt', function(e) { 
		$(document).bind('mouseup.mt', function(e) { $(document).unbind('mousemove.mt') });
		$(document).bind('mousemove.mt', function(e) {
			// Get cursor position
			var x = e.pageX - slider.offset().left;
			var y = e.pageY - slider.offset().top;

			// Check within bounds of slider
			if (y > 20 || y < 0 || x < 0 || x > slider.width())
				return false;
			
			// Set new position
			slider_selector.css('left', x).css('top', slider.offset().top);

		/*
			results.html("A: "       + Math.round(100 - distance_a*200.0/total) + 
			             "<br />B: " + Math.round(100 - distance_b*200.0/total) + 
						 "<br />C: " + Math.round(100 - distance_c*200.0/total));

		});
	});*/
