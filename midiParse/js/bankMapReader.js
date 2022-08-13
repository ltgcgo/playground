"use strict";

const sgCrit = ["MSB", "PRG", "LSB"];

self.soundBankInfo = [];
self.getSoundBank = function (msb = 0, prg = 0, lsb = 0) {
	let bankName;
	let args = Array.from(arguments);
	if (args[0] == 127 && args[2] == 0) {
		if (args[1] > 111) {
			args[1] = 0;
		};
	};
	if (args[0] == 0) {
		if (args[2] > 111 && args[2] < 120) {
			args[2] = 0;
		};
	};
	//let to = soundBankInfo;
	let ending = "#";
	while (!(bankName?.length > 0)) {
		bankName = soundBankInfo[args[1] || 0][(args[0] << 7) + args[2]];
		if (!bankName) {
			args[2] = 0;
			ending = "^";
			if (!soundBankInfo[args[1] || 0][args[0] << 7]) {
				args[0] = 0;
				ending = "*";
			};
		};
	};
	/*if (!soundBankInfo[msb] || !sound) {
		args[0] = 0;
		correctName = false;
	};
	if (!soundBankInfo[args[0]][prg][args[2]]) {
		args[2] = 0;
		correctName = false;
	};*/
	//bankName = soundBankInfo[args[0]][args[1]][args[2]];
	/* for (let c = 0; c < 3; c ++) {
		to = to[args[c] || 0] || "";
		if (c == 1) {
			// PRG
			if (!to[args[2]]) {
				correctName = false;
				args[2] = 0;
			};
		} else if (c == 0) {
			// MSB
			if (!to || !to[args[1]]) {
				// Non-existent MSB
				correctName = false;
				args[0] = 0;
				to = soundBankInfo[0];
			};
		} else {
			// LSB
			bankName = to;
		};
		if (!to) {
			if (c == 2 && !self.debugMode) {
				bankName = Array.from(soundBankInfo[0][prg][0]);
				bankName[7] = "^";
				bankName = bankName.join("");
			} else {
				continue;
			};
		} else {
			if (c == 2) {
				bankName = to;
			};
		};
	};*/
	if (ending != "#") {
		if (self.debugMode) {
			bankName = "";
		} else {
			bankName = Array.from(bankName.padEnd(8, " "));
			bankName[8] = ending;
			bankName = bankName.join("");
		}
	};
	return bankName || (msb || 0).toString().padStart(3, "0") + " " + (prg || 0).toString().padStart(3, "0") + " " + (lsb || 0).toString().padStart(3, "0");
};
self.renewBankMap = async function (...type) {
	delete self.soundBankInfo;
	self.soundBankInfo = [];
	for (let c = 0; c < type.length; c ++) {
		await fetch(`./data/bank/${type[c]}.tsv`).then(function (response) {return response.text()}).then(function (text) {
			console.info(`Parsing voice map: ${type[c]}`);
			let sig = []; // Significance
			text.split("\n").forEach(function (e, i) {
				let assign = e.split("\t"), to = [];
				if (i == 0) {
					assign.forEach(function (e0, i0) {
						sig[sgCrit.indexOf(e0)] = i0;
					});
					console.info(`Bank map significance: ${sig}`);
				} else {
					assign.forEach(function (e1, i1) {
						if (i1 > 2) {
							//soundBankInfo[to[sig[0]]] = soundBankInfo[to[sig[0]]] || [];
							//soundBankInfo[to[sig[0]]][to[sig[1]]] = soundBankInfo[to[sig[0]]][to[sig[1]]] || [];
							//soundBankInfo[to[sig[0]]][to[sig[1]]][to[sig[2]]] = soundBankInfo[to[sig[0]]][to[sig[1]]][to[sig[2]]] || assign[3];
							soundBankInfo[to[sig[1]]] = soundBankInfo[to[sig[1]]] || [];
							soundBankInfo[to[sig[1]]][(to[sig[0]] << 7) + to[sig[2]]] = assign[3];
						} else {
							to.push(parseInt(assign[i1]));
						};
					});
				};
			});
		});
	};
};