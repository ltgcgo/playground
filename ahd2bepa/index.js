// PoC AHD to BEPA converter

"use strict";

let dict = {}, dictText = `o͝or;ʊə
ŏŏr;ʊə
âr;ɛə
îr;ɪə
oi;ɔɪ
o͝o;ʊ
ŏŏ;ʊ
o͞o;uː
ōō;uː
ou;aʊ
ä;ɑ
ă;æ
ā;eɪ
ĕ;ɛ
ĕ;iː
ĭ;ɪ
ī;aɪ
ŏ;ɒ
ô;ɔː
ō;əʊ
ŭ;ʌ
û;ɜː`;
dictText.split("\n").forEach((e) => {
	let line = e.split(";");
	dict[line[0]] = [line[1]];
});

let toBEPA = function (ahdText) {
	let result = ahdText;
	for (let ahd in dict) {
		result = result.replaceAll(ahd, dict[ahd]);
	};
	return result;
};
