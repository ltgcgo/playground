"use strict";

String.prototype.apply = function (map, activator) {
	/*
	Mode 0 for seeking replacement activation
	Mode 1 for building replacement instruction
	Mode 2 for lingering activation seek
	*/
	let mode = 0;
};

// Some tests
someFood = {
	foodA: "cheese",
	foodB: "cakes",
	foodC: {
		foodA: "gras",
		foodB: "foie"
	}
};
console.info("I love ${foodA} and ${foodB}"); // Should be successful
console.info("I love ${foodA}{foodB}"); // Should be successful
console.info("I love ${foodA}${foodB}"); // Should be successful
console.info("I love ${foodA} {foodB}"); // The latter should be unsuccessful
console.info("I love ${foodC{foodB}} and ${foodC{foodA}}");  // Should be successful
