$(function() {
	function withinTriangle(edgeLength, x, y) {
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

	var root = $('div.mt');
	var triangle = $('<div class="magic-triangle" />').appendTo(root);
	var selector = $('<div class="magic-triangle-selector" />').appendTo(triangle);
	var slider = $('<div class="magic-triangle-slider" />').appendTo(root);
	var slider_selector = $('<div class="magic-triangle-selector" />').appendTo(slider);
	var results = $('<p>').appendTo(root);

	triangle.bind('mousedown.mt', function(_) {
		$(document).bind('mouseup.mt', function(e) { $(document).unbind('mousemove.mt') });
		$(document).bind('mousemove.mt', function(e) {
			// Get cursor position
			var x = e.pageX - triangle.offset().left;
			var y = e.pageY - triangle.offset().top;

			// Check that within bounds of equilateral triangle
			if (!withinTriangle(triangle.width(), x, y))
				return;
			
			// Set new position
			selector.css('left', x - selector.width()/2).css('top', y - selector.height()/2);

			//distance_a = (100.0-(y*100.0/triangle.height()));
			distance_a = Math.sqrt(Math.pow(y, 2) + Math.pow(triangle.width()/2 - x, 2));
			distance_b = Math.sqrt(Math.pow(triangle.height()-y, 2) + Math.pow(x, 2));
			distance_c = Math.sqrt(Math.pow(triangle.height()-y, 2) + Math.pow(triangle.width()-x, 2));

			total = distance_a + distance_b + distance_c;

			results.html("A: "       + Math.round(100 - distance_a*200.0/total) + 
			             "<br />B: " + Math.round(100 - distance_b*200.0/total) + 
						 "<br />C: " + Math.round(100 - distance_c*200.0/total));

		});
	});

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
*/
		});
	});

});
