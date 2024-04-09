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
ch;tʃ
ᴋʜ;x
ng;ŋ
sh;ʃ
th;θ
t͟h;ð
zh;ʒ
ə;ʌ
ər;ə
ä;ɑː
ă;æ
ā;eɪ
ĕ;ɛ
ē;iː
ĭ;ɪ
ī;aɪ
ŏ;ɒ
ô;ɔː
ō;əʊ
ŭ;ʌ
û;ɜː
a;æ
e;ɛ
i;ɪ
o;ɒ
ʌr;ə
ʍ;hw
j;dʒ
y;j
ü;y`;
dictText.split("\n").forEach((e) => {
	let line = e.split(";");
	dict[line[0]] = [line[1]];
});

let toBEPA = function (ahdText) {
	let result = ahdText.replaceAll("-", "");
	for (let ahd in dict) {
		result = result.replaceAll(ahd, dict[ahd]);
		//console.debug(result);
	};
	return result;
};
