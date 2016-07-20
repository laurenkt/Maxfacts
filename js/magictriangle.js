$(function() {
	var descriptors = ["Kitchen", "Room", "Bathroom", "Noisiness",
	                   "Carpet squidginess", "Temperature"];
	function step1($root) {
		var rows = Math.ceil(descriptors.length);		

		$.each(descriptors, function(_, d) {
			alert(d);
		});
	}


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
		.ternaryPlot()
		.slider()
		.each(function (_, node) {
			node.ternaryPlot.addLabels(descA, descB, descC);
		});

	var results = $('<p/>');
	
	$('button').click(function(e) {
		var triangle = $('div.mt').get(0).ternaryPlot;
		var slider = $('div.mt').get(0).slider;

		results.html('<strong>Ratio of problems:</strong><br>' + descA.text() + ': ' + triangle.a + '%<br>' + descB.text() + ': ' + triangle.b + '%<br>' + descC.text() + ': ' + triangle.c + '%<br><strong>Overall severity</strong>: ' + slider.value+ '%');
		$('.container').append(results);
	});
});
