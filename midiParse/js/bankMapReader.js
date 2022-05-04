"use strict";

self.soundBankInfo = [];
self.getSoundBank = function (msb, prg, lsb) {
	let bankName = (msb || 0).toString().padStart(3, "0") + " " + (prg || 0).toString().padStart(3, "0") + " " + (lsb || 0).toString().padStart(3, "0") + " ";
	let to = soundBankInfo;
	for (let c = 0; c < 3; c ++) {
		to = to[arguments[c]];
		if (!to) {
			break;
		} else if (c == 2) {
			bankName = to;
		};
	};
	return bankName.padEnd(9, " ").padStart(10, " ").padEnd(11, " ").padStart(12, " ");
};
self.renewBankMap = function (type) {
	fetch(`./data/bank/${type}.tsv`).then(function (response) {return response.text()}).then(function (text) {
		delete self.soundBankInfo;
		self.soundBankInfo = [];
		text.split("\n").forEach(function (e) {
			let assign = e.split("\t"), to = [];
			assign.forEach(function (e, i) {
				if (i > 2) {
					soundBankInfo[to[0]] = soundBankInfo[to[0]] || [];
					soundBankInfo[to[0]][to[1]] = soundBankInfo[to[0]][to[1]] || [];
					soundBankInfo[to[0]][to[1]][to[2]] = assign[3];
				} else {
					to.push(parseInt(assign[i]));
				};
			});
		});
	});
};
