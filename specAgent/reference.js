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
	Object.defineProperty(this, "register", {value: function (spec) {
		let foundIndex = specs.indexOf(spec);
		if (foundIndex != -1) {
			throw Error("Already registered");
		};
		order[specs.length] = spec.name;
		specs.push(spec);
		this[spec.name] = (spec.constructor == Specification) ? new Proxy(spec, {}) : spec;
	}});
	Object.defineProperty(this, "unregister", {value: function (spec) {
		let foundIndex = specs.indexOf(spec);
		if (foundIndex == -1) {
			throw Error("Not registered");
		};
		if (order[foundIndex] == spec.name) {
			delete this[spec.name];
			order.splice(foundIndex, 1);
			specs.splice(foundIndex, 1);
		} else {
			throw(new Error("Internal error"));
		};
	}});
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
	Object.defineProperty(this, "get", {value: function (name) {
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
	}});
};
