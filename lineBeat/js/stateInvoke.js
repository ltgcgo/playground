"use strict";
var $invoke;

{
	let funcList = [], fullList = [];
	$invoke = function (mustFull, target) {
		console.log("Invoked.");
		if (self.document || self.document.readyState) {
			switch (document.readyState) {
				case "interactive": {
					if (!mustFull) {
						target();
					} else {
						fullList.push(target);
					};
					break;
				};
				case "complete": {
					target();
					break;
				};
				default: {
					if (mustFull) {
						fullList.push(target);
					} else {
						funcList.push(target);
					};
				};
			};
		};
	};
	if (self.document) {
		document.addEventListener("readystatechange", function () {
			console.log(document.readyState);
			switch (document.readyState) {
				case "interactive": {
					funcList.forEach((e) => {
						new Promise(function (p) {
							try {
								e();
								p();
							} catch (err) {
								console.error(err.stack);
							};
						});
					});
					funcList = undefined;
					break;
				};
				case "complete": {
					if (funcList) {
						funcList.forEach((e) => {
							new Promise(function (p) {
								try {
									e();
									p();
								} catch (err) {
									console.error(err.stack);
								};
							});
						});
						funcList = undefined;
					};
					fullList.forEach((e) => {
						new Promise(function (p) {
							try {
								e();
								p();
							} catch (err) {
								console.error(err.stack);
							};
						});
					});
					fullList = undefined;
					break;
				};
			};
		});
	};
};
