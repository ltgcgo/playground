"use strict";

self.Specification = self.Specification || function (name) {
	if (name == null || name == undefined) {
		throw(new Error("Name is required"));
	};
	this.name = name;
};
self.SpecAgent = self.SpecAgent || function () {
	let specs = [], order = [];
	let updateOrder = function () {
		if (order.length > specs.length) {
			order.splice(specs.length, order.length - specs.length);
		};
		specs.forEach(function (e, i) {
			order[i] = e.name;
		});
	};
	this.register = function (spec) {
		let foundIndex = specs.indexOf(spec);
		if (foundIndex != -1) {
			throw Error("Already registered");
		};
		order[specs.length] = spec.name;
		specs.push(spec);
		this[spec.name] = (spec.constructor == Specification) ? new Proxy(spec, {}) : spec;
	};
	this.unregister = function (spec) {
		let foundIndex = specs.indexOf(spec);
		if (foundIndex == -1) {
			throw Error("Not registered");
		};
		specs
	};
	Object.defineProperty(this, "length", {
		get: function () {
			return order.length;
		}
	});
	Object.defineProperty(this, "list", {
		get: function () {
			return order.slice();
		}
	});
	this.get = function (name) {
		let notSuccess = true, loop = 0, result;
		while (notSuccess) {
			let currentPos = order.indexOf(name);
			if (currentPos == -1) {
				updateOrder();
			} else {
				if (specs[currentPos].name == order[currentPos]) {
					result = specs[currentPos];
					notSuccess = false;
				} else {
					updateOrder();
				};
			};
			if (loop > 1) {
				notSuccess = false;
			};
			loop ++;
		};
		return result;
	};
};
