"use strict";

// Quick actions
self["$"] = self["$"] || function (selector, source) {
	var src = source || document;
	return src.querySelector(selector);
};
self["$$"] = self["$$"] || function (selector, source) {
	var src = source || document;
	return Array.from(src.querySelectorAll(selector));
};
HTMLElement.prototype.$ = function (selector) {
	return $(selector, this);
};
HTMLElement.prototype.$$ = function (selector) {
	return $$(selector, this);
};
var generateRandom = function (length) {
	var tmp = "";
	var map = "0123456789abcdefghijklmnopqrstuvwxyz_-";
	for (var tick = 0; tick < length; tick ++) {
		tmp += map[Math.floor(Math.random() * map.length)];
	};
	return tmp;
};

// Timed stop watch


var WCSMS = {}, WCSME = {}; // Webcirque Custom Script Maintained Styles
// Content of the maintained CSS
/*
 * the speed factor of the scroller can be adjusted upon demand
 * it's correct 1x speed must be 48 pixels per second.
*/
WCSMS.scroller = {
	prop: "wcsms-textDial-${id} ${duration}s linear infinite",
	frames: "@keyframes wcsms-textDial-${id} {\n	0% {\n		left: 0px;\n	}${stopby}\n	100% {\n		left: -${end}px;\n	}\n}",
	stopbyFrame: "\n	${stopAt}% {\n 		left: 0px;\n	}",
	speedUnit: 48,
	speedFactor: 1,
	restTime: 5,
	gapWidth: 16,
	fps: 60,
	lazyUpdate: false
};
//Custom Element
WCSME.TextDialElement = function (element, conf = {}) {
	element.textDial = element.textDial || new (function (ele) {
		// Initiate
		var target = element;
		var intermediate = target.innerText;
		var upThis = this;
		// Customized settings per element
		var tConf = {};
		tConf.speedUnit = conf.speedUnit;
		tConf.speedFactor = conf.speedFactor;
		tConf.restTime = conf.restTime;
		tConf.gapWidth = conf.gapWidth;
		// Clear original context
		target.innerText = "";
		// Create dummies
		var dummy = document.createElement("span");
		var dummy1 = document.createElement("span");
		var dummy2 = false, managedStyle = false, calculated = false, lastScroll = 0, lastConf = false;
		dummy1.innerText = intermediate;
		dummy.appendChild(dummy1);
		target.appendChild(dummy);
		// Scroll application (for CSS)
		this.id = generateRandom(20);
		this.hookedElement = element;
		// Update gap width
		this.update = function () {
			// Dummy manipulation
			if (dummy2) {
				if (dummy1.offsetWidth <= target.offsetWidth) {
					dummy2.remove();
					dummy2 = false;
				} else {
					this.scrollWidth = dummy2.offsetLeft;
				};
			} else {
				if (dummy1.offsetWidth > target.offsetWidth) {
					dummy2 = document.createElement("span");
					dummy2.innerText = intermediate;
					dummy2.style.marginLeft = (this.gapWidth || WCSMS.scroller.gapWidth).toString() + "px";
					dummy.appendChild(dummy2);
					this.scrollWidth = dummy2.offsetLeft;
				};
			};
			// Calculate CSS animation
			// Do not recalculate when the content width did not change
			if (dummy2) {
				if (this.scrollWidth != lastScroll || tConf.toMap().quickRel(lastConf.toMap()) != 2) {
					calculated = {};
					calculated.id = calculated.id ? calculated.id : this.id;
					calculated.originalDuration = (this.scrollWidth / (tConf.speedUnit || WCSMS.scroller.speedUnit)) / (tConf.speedFactor || WCSMS.scroller.speedFactor);
					calculated.duration = Math.round((calculated.originalDuration + (tConf.restTime || WCSMS.scroller.restTime)) * 10) / 10;
					calculated.stopby = "";
					calculated.stopAt = Math.round((1 - (calculated.originalDuration / calculated.duration)) * 1000) / 10;
					calculated.end = this.scrollWidth;
					lastScroll = this.scrollWidth;
					lastConf = Object.assign({}, tConf);
					if ((tConf.restTime || WCSMS.scroller.restTime) >= 0.05) {
						calculated.stopby = WCSMS.scroller.stopbyFrame.alter(calculated);
					};
					this.animator = WCSMS.scroller.prop.alter(calculated);
					this.animation = WCSMS.scroller.frames.alter(calculated);
				};
			};
			if (dummy1.offsetWidth > target.offsetWidth) {
				dummy.style.animation = this.animator;
				if (!managedStyle) {
					managedStyle = document.createElement("style");
					document.head.appendChild(managedStyle);
					WCSME.TextDialElement.managed.set(this.id, this);
				};
				managedStyle.id = "wcsms-scroller-${id}".alter(calculated);
				managedStyle.innerHTML = this.animation;
			} else {
				if (managedStyle) {
					managedStyle.innerHTML = "";
				};
			};
		};
		// Define getter and setter
		Object.defineProperty(this, "text", {
			"get": function () {
				return intermediate;
			},
			"set": function (destText) {
				intermediate = destText;
				dummy1.innerText = destText;
				this.update();
				if (dummy2) {
					dummy2.innerText = destText;
				};
				return intermediate;
			}
		});
		["speedFactor", "speedUnit", "restTime", "gapWidth"].forEach(function (e) {
			Object.defineProperty(upThis, e, {
				"get": function () {
					return tConf[e];
				},
				"set": function (dest) {
					if (dest.constructor == Number) {
						tConf[e] = dest;
						if (!WCSMS.scroller.lazyUpdate) {
							this.update();
						};
					} else {
						throw(new TypeError("expected a Number"));
					};
				}
			});
		});
		// Update looks
		this.update();
	})(element);
	return element.textDial;
};
WCSME.TextDialElement.managed = new Map();
WCSME.TextDialElement.update = function () {
	this.managed.forEach((e) => {
		e.update();
	});
};

document.addEventListener("readystatechange", function () {
	if (this.readyState == "interactive") {
		$$(".custom-textdial").forEach(function (e) {
			new WCSME.TextDialElement(e);
		});
	};
});
