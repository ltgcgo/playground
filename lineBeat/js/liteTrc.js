"use strict";

var parseTime = function (ttext) {
	let tArr = ttext.split(":"), tTime = 0;
	tArr.forEach(function (e3, i3) {
		tTime += parseFloat(e3) * 60 ** (tArr.length - i3 - 1);
	});
	return tTime;
};
var getEvents = function (text) {
	let times = [], cumulative = 0, NewTime = function (t, e) {
		this.start = t;
		this.end = e;
		this.id = cumulative ++;
	};
	text.split("\n").forEach(function (e1, i1) {
		if (e1[0] != "#") {
			let curMode = 0, lineTime = 0, lastTime = 0, buffer = "";
			Array.from(e1).forEach(function (e2, i2) {
				switch (curMode) {
					case 0: {
						// Waiting for time announce
						if (e2 == "[") {
							curMode = 1;
						};
						break;
					};
					case 1: {
						if (e2 == "]") {
							if ("0123456789".indexOf(buffer[0]) != -1) {
								let tTime = parseTime(buffer);
								console.log(`Received time announcement on line ${i1 + 1}. Line start at ${tTime}`);
								lineTime = tTime;
								lastTime = 0;
							};
							buffer = "";
							curMode = 2;
						} else {
							buffer += e2;
						};
						break;
					};
					case 2: {
						if (e2 == "<") {
							curMode = 3;
						};
						break;
					};
					case 3: {
						if (e2 == ">") {
							let curTime = parseInt(buffer) + lastTime;
							times.push(new NewTime((lineTime + (lastTime / 1000)), (lineTime + (curTime / 1000))));
							lastTime = curTime;
							buffer = "";
							curMode = 2;
						} else {
							buffer += e2;
						};
						break;
					};
				};
			});
		};
	});
	times.getCurrent = function (time) {
		let size = times.length, blockSize = Math.floor(Math.sqrt(size)), pointer = 0, pointerStart = 0, mode = 0, result;
		while (mode < 2) {
			switch (mode) {
				case 0: {
					if (pointer >= size || pointer < 0) {
						mode = 2;
					} else if (this[Math.min(size - 1, pointer + blockSize)].end >= time) {
						pointerStart = pointer;
						mode = 1;
					} else {
						pointer += blockSize;
					};
					break;
				};
				case 1: {
					if (pointer > Math.min((pointerStart + blockSize), size - 1)) {
						mode = 2;
					} else if (this[pointer].start <= time && this[pointer].end > time) {
						result = this[pointer];
					};
					pointer ++;
					break;
				};
			};
		};
		return result;
	};
	return times;
};
