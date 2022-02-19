"use strict";

{
	let objectPath = function (path, obj) {
		let result = obj, paths = path.split(".");
		paths.forEach(function (e) {
			result = result[e];
		});
		return result;
	};
	String.prototype.apply = function (map, activator = "${}") {
		/*
		Mode 0 for seeking replacement activation
		Mode 1 for building replacement instruction
		*/
		let mode = 0, skip = 0, step = -1, instr = [], found = "", result = "";
		Array.from(this).forEach(function (e) {
			if (skip > 0) {
				result += e;
				skip --;
			} else if (e == '\\') {
				skip ++;
			} else {
				switch (mode) {
					case 0: {
						if (e == activator[0]) {
							mode = 1;
						} else {
							result += e;
						};
						break;
					};
					case 1: {
						if (e == activator[1]) {
							step ++;
							instr.push("");
						} else if (e == activator[2]) {
							found = objectPath(instr[step], map);
							step --;
							if (step < 0) {
								result += found;
							} else {
								instr[step] += found;
							};
							instr.pop();
						} else if (step < 0) {
							if (e != activator[0]) {
								result += e;
								mode = 0;
							};
						} else {
							instr[step] += e;
						};
						break;
					};
				};
			};
		});
		return result;
	};

	// Some tests
	let someFood = {
		foodA: "cheese",
		foodB: "cakes",
		foodC: {
			cheese: "gras",
			cakes: "foie"
		}
	};
	console.info("I love ${foodA} and ${foodB}".apply(someFood)); // Should be successful
	console.info("I love ${foodA}{foodB}".apply(someFood)); // Should be successful
	console.info("I love ${foodA}${foodB}".apply(someFood)); // Should be successful
	console.info("I love ${foodA} {foodB}".apply(someFood)); // The latter should be unsuccessful
	console.info("I love ${foodC.{foodB}} ${foodC.{foodA}}".apply(someFood));  // Should be successful
	console.info("Price: \\$1".apply(someFood));
};
