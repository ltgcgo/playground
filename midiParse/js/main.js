"use strict";

let midiBlob, midiBuffer, midiJson, msgPort;
const map = "0123456789_aAbBcCdDeEfFgGhHiIjJ-kKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ";
const noteRegion = "!0123456789";

let xgEffType = [
	"off",
	"hall",
	"room",
	"stage",
	"plate",
	"delay LCR",
	"delay LR",
	"echo",
	"cross delay",
	"early reflections",
	"gate reverb",
	"reverse gate"
];
xgEffType[16] = "white room";
xgEffType[17] = "tunnel";
xgEffType[19] = "basement";
xgEffType[20] = "karaoke";
xgEffType[64] = "pass through";
xgEffType[65] = "chorus";
xgEffType[66] = "celeste";
xgEffType[67] = "flanger";
xgEffType[68] = "symphonic";
xgEffType[69] = "rotary speaker";
xgEffType[70] = "tremelo";
xgEffType[71] = "auto pan";
xgEffType[72] = "phaser";
xgEffType[73] = "distortion";
xgEffType[74] = "overdrive";
xgEffType[75] = "amplifier";
xgEffType[76] = "3-band EQ";
xgEffType[77] = "2-band EQ";
xgEffType[78] = "auto wah";
const xgPartMode = [
	"melodic",
	"drum",
	"drum set 1",
	"drum set 2"
];
const xgDelOffset = [
	17.1, 18.6, 20.2, 21.8, 23.3,
	24.9, 26.5, 28, 29.6, 31.2,
	32.8, 34.3, 35.9, 37.5, 39,
	40.6, 42.2, 43.7, 45.3, 46.9,
	48.4, 50
];
const xgNormFreq = [
	20, 22, 25, 28, 32, 36, 40, 45,
	50, 56, 63, 70, 80, 90, 100, 110,
	125, 140, 160, 180, 200, 225, 250, 280,
	315, 355, 400, 450, 500, 560, 630, 700,
	800, 900, 1E3, 1100, 1200, 1400, 1600, 1800,
	2E3, 2200, 2500, 2800, 3200, 3600, 4E3, 4500,
	5E3, 5600, 6300, 7E3, 8E3, 9E3, 1E4, 11E3,
	12E3, 14E3, 16E3, 18E3, 2E4
];
const xgLfoFreq = [
	0, 0.04, 0.08, 0.13, 0.17, 0.21, 0.25, 0.29,
	0.34, 0.38, 0.42, 0.46, 0.51, 0.55, 0.59, 0.63,
	0.67, 0.72, 0.76, 0.8, 0.84, 0.88, 0.93, 0.97,
	1.01, 1.05, 1.09, 1.14, 1.18, 1.22, 1.26, 1.3,
	1.35, 1.39, 1.43, 1.47, 1.51, 1.56, 1.6, 1.64,
	1.68, 1.72, 1.77, 1.81, 1.85, 1.89, 1.94, 1.98,
	2.02, 2.06, 2.10, 2.15, 2.19, 2.23, 2.27, 2.31,
	2.36, 2.4, 2.44, 2.48, 2.52, 2.57, 2.61, 2.65,
	2.69, 2.78, 2.86, 2.94, 3.03, 3.11, 3.2, 3.28,
	3.37, 3.45, 3.53, 3.62, 3.7, 3.87, 4.04, 4.21,
	4,37, 4.54, 4.71, 4.88, 5.05, 5.22, 5.38, 5.55,
	5.72, 6.06, 6.39, 6.73, 7.07, 7.4, 7.74, 8.08,
	8.41, 8.75, 9.08, 9.42, 9.76, 10.1, 10.8, 11.4,
	12.1, 12.8, 13.5, 14.1, 14.8, 15.5, 16.2, 16.8,
	17.5, 18.2, 19.5, 20.9, 22.2, 23.6, 24.9, 26.2,
	27.6, 28.9, 30.3, 31.6, 33.0, 34.3, 37.0, 39.7
];

// Quick paths
self.$e = function (selector, source) {
	if (!source) {
		return document.querySelector(selector);
	} else {
		return source.querySelector(selector);
	};
};
self.$a = function (selector, source) {
	if (!source) {
		return Array.from(document.querySelectorAll(selector));
	} else {
		return Array.from(source.querySelectorAll(selector));
	};
};

// Match array
let sameArray = function (a, b) {
	if (a.length != b.length) {
		return false;
	} else {
		for (let c = 0; c < a.length; c ++) {
			if (a[c] != b[c]) {
				return false;
				break;
			} else if (c == a.length - 1) {
				return true;
			};
		};
	};
};
let compArr = function (a, b) {
	let minL = Math.min(a.length, b.length),
	c = a.slice(0, minL),
	d = b.slice(0, minL);
	let result = 0, pointer = 0;
	while (pointer < minL && result == 0) {
		result = Math.sign(c[pointer] - d[pointer]);
		pointer ++;
	};
	//console.debug(result, a, b);
	return result;
};

// Arbitrary array prefix matcher
let prefMatch = function () {
	this.pool = [];
	this.point = function (prefix, insert = false) {
		//console.debug(prefix);
		if (this.pool.length > 0) {
			let bound = this.pool.length, // boundary
			bs = 1 << Math.floor(Math.log2(bound)), // block size
			pp = bs, // position pointer
			//ip = 0, // array index pointer
			ttl = 64; // time to live
			// Binary search
			while (bs >= 1 && ttl >= 0) {
				// Status report
				//console.debug(`BS(${bs}), TTL(${ttl}), PP(${pp})[${this.pool[pp]}]`);
				if (ttl <= 0) {
					throw(new Error("TTL reached."));
				};
				if (pp == bound) {
					//console.debug(`Returning into bound.`);
					pp -= bs;
				} else {
					let result = compArr(prefix, this.pool[pp]);
					switch (result) {
						case 0: {
							ttl = 0;
							break;
						};
						case 1: {
							if (pp + bs <= bound) {
								pp += bs;
							};
							break;
						};
						case -1: {
							if (pp != 0) {
								pp -= bs;
							};
							break;
						};
						default: {
							console.warn(`Unexpected result ${result}.`);
						};
					};
				};
				bs = bs >> 1;
				ttl --;
			};
			// After match
			let match = true;
			if (pp >= this.pool.length) {
				match = false;
			} else {
				let upThis = this;
				this.pool[pp].forEach(function (e, i, a) {
					if (match) {
						if (e != prefix[i]) {
							match = false;
							//console.debug(`Pointer mismatch at pointer ${i}. Target: [${prefix}], prefix: [${upThis.pool[pp]}]`);
						};
					};
				});
				if (!match && compArr(prefix, this.pool[pp]) > 0) {
					pp ++;
				};
			};
			//console.debug(`Insert: ${insert || false}, pointer: ${pp}`);
			return (match || insert) ? pp : -1;
		} else {
			return insert ? 0 : -1;
		};
	};
	this.register = function (prefix, func) {
		prefix.func = func;
		this.pool.splice(this.point(prefix, true), 0, prefix);
		return this;
	};
	this.default = function (info) {
		console.warn(`No match for "${info}". Default action not defined.`);
	};
	this.run = function (prefix, ...additional) {
		let idx = this.point(prefix);
		if (idx > -1) {
			this.pool[idx].func(prefix.slice(this.pool[idx].length), ...additional);
		} else {
			this.default(prefix, ...additional);
		};
	};
};

// Read as array buffer
let getBuffer = function (blob) {
	return new Promise(function (proceed, failure) {
		let fileReader = new FileReader();
		fileReader.onload = function (data) {
			proceed(fileReader.result);
		};
		fileReader.readAsArrayBuffer(blob);
	});
};

// Trailing points
let trailPt = function (number, integer = 2, float = 2) {
	let result = "", int = Math.floor(number);
	result += int.toString().padStart(integer, "0");
	result += ".";
	result += Math.floor((number - int) * Math.pow(10, float)).toString().padStart(float, "0");
	return result;
};

// How much pitch bending?
let textedPitchBend = function (number) {
	let normalized = (number[1] % 128 * 128 + number[0]) - 8192;
	let result = "--";
	if (normalized > 0) {
		let truncated = normalized >> 11;
		result = ["=-", ">-", ">=", ">>"][truncated];
	} else if (normalized < 0) {
		let inverted = Math.abs(normalized) >> 11;
		result = ["-=", "-<", "=<", "<<", "<<"][inverted];
	};
	return result;
};
let textedPanning = function (number) {
	let result = Array.from("----");
	if (number > 64) {
		for (let c = 0; number > 64; c ++) {
			result[c] = (number < 72) ? "=" : ">";
			number -= 16;
		};
	} else if (number < 64) {
		for (let c = 3; number < 64; c --) {
			result[c] = (number >= 56) ? "=" : "<";
			number += 16;
		};
	};
	return result.join("");
};
let getMsb = function (mode, channel) {
	if (channel % 16 == 9) {
		switch (mode) {
			case 4:
			case 6: {
				return 120;
				break;
			};
			default: {
				return 127;
			};
		};
	} else {
		return 0;
	};
};
let getStd = function (msb = 0, prg = 0, lsb = 0) {
	let src = midiModeName[0],
	result = src[0];
	switch (msb) {
		case 0: {
			if (lsb == 0) {
				// General MIDI
				result = src[1];
			} else if (lsb > 125) {
				// Roland MT-32
				result = src[3];
			} else {
				// YAMAHA XG
				result = src[5];
			};
			break;
		};
		case 1:
		case 2:
		case 3:
		case 4:
		case 5:
		case 6:
		case 7:
		case 8:
		case 9:
		case 10:
		case 11:
		case 12:
		case 13:
		case 14:
		case 15:
		case 16:
		case 24:
		case 32:
		case 120: {
			// Roland GS
			result = src[4];
			break;
		};
		case 56: {
			// KORG AG-10
			result = "AG";
			break;
		};
		case 61:
		case 62:
		case 83:
		case 89:
		case 90:
		case 91: {
			// KORG
			result = src[2];
			break;
		};
		case 64:
		case 126:
		case 127: {
			if (lsb < 126) {
				// YAMAHA XG
				result = src[5];
			} else {
				result = src[3];
			};
			break;
		};
		case 81: {
			// KORG 05R/W
			result = "RW";
			break;
		};
		case 82: {
			// KORG X5D
			result = "XD";
			break;
		};
		case 121: {
			// General MIDI level 2
			result = src[6];
			break;
		};
	};
	return result;
};
let getDecibel = function (raw) {
	return Math.round(2000 * Math.log10(raw / 63.65077867)) / 100;
};
let getXgRevTime = function (data) {
	let a = 0.1, b = -0.3;
	if (data > 66) {
		a = 5, b = 315;
	} else if (data > 56) {
		a = 1, b = 47;
	} else if (data > 46) {
		a = 0.5, b = 18.5;
	};
	return a * data - b;
};
let getXgDelayOffset = function (data) {
	if (data > 105) {
		return xgDelOffset[data - 106];
	} else if (data > 100) {
		return data * 1.1 - 100;
	} else {
		return data / 10;
	};
};

{
	self.randomID = function (length) {
		let uint8 = new Uint8Array(length);
		let string = "";
		crypto.getRandomValues(uint8);
		uint8.forEach(function (e) {
			string += map[e >> 2];
		});
		return string;
	};
};

self.setMidi = async function (data) {
	midiBlob = data;
	midiBuffer = await getBuffer(midiBlob);
	midiJson = MidiParser.parse(new Uint8Array(midiBuffer));
	self.midiEventPool = new MidiEventPool(midiJson);
	switchedTrack = true;
};
self.setAudio = async function (data) {
	if (self.audioBlob) {
		URL.revokeObjectURL(audioBlob);
	};
	self.audioBlob = data;
	audioPlayer.src = URL.createObjectURL(audioBlob);
};

{
	// Send and receive messages
	self.msgId = randomID(16);
	msgPort = new BroadcastChannel(msgId);
	msgPort.onmessage = async function (data) {
		switch (data.data.type) {
			case "midi": {
				setMidi(data.data.blob);
				break;
			};
			case "audio": {
				setAudio(data.data.blob);
				break;
			};
		};
	};
};

renewBankMap("xg", "gs", "ns5r");
/* setInterval(function () {
	renewBankMap("xg");
}, 5000); */
fetch("./demo/Sam Sketty - Low Down.mid").then(function (response) {return response.blob()}).then(function (blob) {setMidi(blob)});

let textField = $e("#textField");
let xgLetterDisp = $e("#xgLetterDisp");
let audioPlayer = $e("audio");
let registerDisp = $e("#register");
let nearestEvent = "", switchedTrack = false;
let audioDelay = 0; // 1.58 for Low Down, 0.976 for Ambient
audioPlayer.src = "./demo/Sam Sketty - Low Down.opus";
audioPlayer.onplaying = function () {
	//textField.innerHTML = "";
	this.reallyPlaying = true;
	pressedNotes.forEach(function (e) {
		for (let c = 0; c < e.length; c ++) {
			e.pop();
		};
	});
	polyphony = 0, maxPoly = 0, lastDispTime = -5;
	registerDisp.innerHTML = "Empty register";
	midiEventPool.list.resetPointer(0);
	midiEventPool.list.pointSpan = 0.5;
};
audioPlayer.onplay = function () {
	if (this.ended || switchedTrack) {
		masterVol = 100;
		textData = "";
		trkName = "";
		delete self.pressedNotes;
		self.pressedNotes = [];
		switchedTrack = false;
		barOffsetNotes = 0;
		karaokeMode = false;
	};
};
audioPlayer.onpause = function () {
	this.reallyPlaying = false;
};
audioPlayer.onended = function () {
	pressedNotes.forEach(function () {
		pressedNotes.unshift();
	});
	nearestEvent = "";
	switchedTrack = true;
	midiMode = 0;
	barOffsetNotes = 0;
	karaokeMode = false;
};
const noteNames = ["C~", "C#", "D~", "Eb", "E~", "F~", "F#", "G~", "Ab", "A~", "Bb", "B~"]
const noteShnms = Array.from("CdDeEFgGaAbB");
const metaType = ["Seq.Num.", "Cmn.Text", "Copyrite", "Trk.Name", "Instrmnt", "C.Lyrics", "C.Marker", "C.CuePnt"];
const midiModeName = [["??", "GM", "AI", "MT", "GS", "XG", "G2"], [
	"UnkwnStd",
	"GnrlMIDI",
	"KORG AI2",
	"RlndMT32",
	"RolandGS",
	"YamahaXG",
	"GenMIDI2"
], [256, 128, 256, 32, 256, 256, 256]];
const scales = ["M", "m"];
let musicTempo = 120, musicBInt = 0.5, musicNomin = 4, musicDenom = 4, curBar = 0, curBeat = 0, curBeatFloat = 0;
let curKey = 0, curScale = 0;
let polyphony = 0, altPoly = 0, maxPoly = 0, masterVol = 100;
let midiMode = 0, lastDispTime = -5, barOffsetNotes = 0, karaokeMode = false;
let textData = "", trkName = "";
self.pressedNotes = [];
let bitmapDisp = $e("canvas").getContext("2d");
let trueBitmap = [], lastBmTime = 0;
let subMsb = 0, subLsb = 0;

// Initialize bitmap
bitmapDisp.fillStyle = "#fff";

// MIDI SysEx reused code
let mt32ToneProp = function (channel, msg) {
	if (midiMode != 3) {
		textData += `\nRoland MT-32 detected via tone properties.`;
		subMsb = 0, subLsb = 127;
	};
	midiMode = midiMode || 3;
	let targetCh = pressedNotes[channel];
	targetCh.npg = targetCh.prg;
	targetCh.nme = "";
	msg.slice(0, 10).forEach(function (e) {
		if (e > 31) {
			targetCh.nme += String.fromCharCode(e);
		};
	});
	console.warn(`MT-32 channel ${channel + 1} (${targetCh.nme}) received:`, msg);
};

// MIDI SysEx execution pool
let sysEx = new prefMatch();
sysEx.default = function (prefix, channel, time) {
	console.warn(prefix, channel, time);
};
let xgPartConf = new prefMatch();
xgPartConf.default = function (prefix, channel, time) {
	console.warn(`XG part setup on channel ${channel}: `, prefix, time);
};
sysEx.register([126, 127, 9, 1], function () {
	// General MIDI reset
	subMsb = 0, subLsb = 0;
	midiMode = 1;
	console.info("MIDI reset: GM");
}).register([126, 127, 9, 3], function () {
	// General MIDI rev. 2 reset
	subMsb = 0, subLsb = 0;
	midiMode = 6;
	console.info("MIDI reset: GM2");
}).register([65, 16, 22, 18, 127, 1], function () {
	// MT-32 reset
	subMsb = 127, subLsb = 127;
	midiMode = 3;
	console.info("MIDI reset: MT-32");
}).register([65, 16, 66, 18], function (msg) {
	// Roland GS reset
	subMsb = 0, subLsb = 0;
	midiMode = 4;
	console.info(`Roland GS reset: ${msg}`);
	console.info("MIDI reset: GS");
}).register([66, 48, 66, 52, 0], function (msg) {
	// KORG NS5R/NX5R System Exclusive
	// No available data for parsing yet...
	subMsb = 0, subLsb = 0;
	midiMode = 2;
	console.info("KORG reset:", msg);
}).register([67, 16, 76, 0, 0, 126, 0], function (msg) {
	// Yamaha XG reset
	subMsb = 0, subLsb = 0;
	midiMode = 5;
	console.info("MIDI reset: XG");
});
// General MIDI SysEx messages
sysEx.register([127, 127, 4, 1], function (msg) {
	// Master volume
	//midiMode = 1;
	masterVol = (msg[1] << 7 + msg[0]) / 163.83;
});;
// Yamaha XG SysEx messages
sysEx.register([67, 16, 76, 6, 0], function (msg) {
	// XG letter display, ASCII only
	let offset = msg[0],
	targetText = Array.from("                \n                ");
	msg.slice(1).forEach(function (e, i) {
		let pointer = i + offset;
		targetText[pointer + Math.floor(pointer / 16)] = String.fromCharCode(e);
		xgLetterDisp.innerHTML = targetText.join("");
		lastDispTime = audioPlayer.currentTime;
	});
}).register([67, 16, 76, 7, 0, 0], function (msg) {
	// XG bitmap display
	lastBmTime = audioPlayer.currentTime;
	trueBitmap = [];
	msg.forEach(function (e, i) {
		let ln = Math.floor(i / 16), co = i % 16;
		let pt = (co * 3 + ln) * 7, threshold = 7, bi = 0;
		pt -= co * 5;
		if (ln == 2) {
			threshold = 2;
		};
		console.info(pt, threshold);
		while (bi < threshold) {
			trueBitmap[pt + bi] = (e >> (6 - bi)) & 1;
			bi ++;
		};
	});
}).register([67, 16, 76, 2, 1, 0], function (msg) {
	console.info(`XG reverb type: ${xgEffType[msg[0]]}${msg[1] > 0 ? " " + (msg[1] + 1) : ""}`);
}).register([67, 16, 76, 2, 1, 2], function (msg) {
	console.info(`XG reverb time: ${getXgRevTime(msg)}s`);
}).register([67, 16, 76, 2, 1, 3], function (msg) {
	console.info(`XG reverb diffusion: ${msg}`);
}).register([67, 16, 76, 2, 1, 4], function (msg) {
	console.info(`XG reverb initial delay: ${msg}`);
}).register([67, 16, 76, 2, 1, 5], function (msg) {
	console.info(`XG reverb high pass cutoff: ${xgNormFreq[msg[0]]}Hz`);
}).register([67, 16, 76, 2, 1, 6], function (msg) {
	console.info(`XG reverb low pass cutoff: ${xgNormFreq[msg[0]]}Hz`);
}).register([67, 16, 76, 2, 1, 7], function (msg) {
	console.info(`XG reverb width: ${msg}`);
}).register([67, 16, 76, 2, 1, 8], function (msg) {
	console.info(`XG reverb height: ${msg}`);
}).register([67, 16, 76, 2, 1, 9], function (msg) {
	console.info(`XG reverb depth: ${msg}`);
}).register([67, 16, 76, 2, 1, 10], function (msg) {
	console.info(`XG reverb wall type: ${msg}`);
}).register([67, 16, 76, 2, 1, 11], function (msg) {
	console.info(`XG reverb dry/wet: ${msg[0]}`);
}).register([67, 16, 76, 2, 1, 12], function (msg) {
	console.info(`XG reverb return: ${msg}`);
}).register([67, 16, 76, 2, 1, 13], function (msg) {
	console.info(`XG reverb pan: ${textedPanning(msg[0])}`);
}).register([67, 16, 76, 2, 1, 16], function (msg) {
	console.info(`XG reverb delay: ${msg}`);
}).register([67, 16, 76, 2, 1, 17], function (msg) {
	console.info(`XG density: ${msg}`);
}).register([67, 16, 76, 2, 1, 18], function (msg) {
	console.info(`XG reverb balance: ${msg}`);
}).register([67, 16, 76, 2, 1, 20], function (msg) {
	console.info(`XG reverb feedback: ${msg}`);
}).register([67, 16, 76, 2, 1, 32], function (msg) {
	console.info(`XG chorus type: ${xgEffType[msg[0]]}${msg[1] > 0 ? " " + (msg[1] + 1) : ""}`);
}).register([67, 16, 76, 2, 1, 34], function (msg) {
	console.info(`XG chorus LFO: ${xgLfoFreq[msg[0]]}Hz`);
}).register([67, 16, 76, 2, 1, 35], function (msg) {
	console.info(`XG chorus LFO phase: ${msg}`);
}).register([67, 16, 76, 2, 1, 36], function (msg) {
	console.info(`XG chorus feedback: ${msg}`);
}).register([67, 16, 76, 2, 1, 37], function (msg) {
	console.info(`XG chorus delay offset: ${getXgDelayOffset(msg[0])}ms`);
}).register([67, 16, 76, 2, 1, 39], function (msg) {
	console.info(`XG chorus low: ${xgNormFreq[msg[0]]}Hz`);
}).register([67, 16, 76, 2, 1, 40], function (msg) {
	console.info(`XG chorus low: ${msg[0] - 64}dB`);
}).register([67, 16, 76, 2, 1, 41], function (msg) {
	console.info(`XG chorus high: ${xgNormFreq[msg[0]]}Hz`);
}).register([67, 16, 76, 2, 1, 42], function (msg) {
	console.info(`XG chorus high: ${msg[0] - 64}dB`);
}).register([67, 16, 76, 2, 1, 43], function (msg) {
	console.info(`XG chorus dry/wet: ${msg}`);
}).register([67, 16, 76, 2, 1, 44], function (msg) {
	console.info(`XG chorus return: ${msg}`);
}).register([67, 16, 76, 2, 1, 45], function (msg) {
	console.info(`XG chorus pan: ${textedPanning(msg[0])}`);
}).register([67, 16, 76, 2, 1, 46], function (msg) {
	console.info(`XG chorus to reverb: ${msg}`);
}).register([67, 16, 76, 2, 1, 64], function (msg) {
	console.info(`XG variation type: ${xgEffType[msg[0]]}${msg[1] > 0 ? " " + (msg[1] + 1) : ""}`);
}).register([67, 16, 76, 2, 1, 66], function (msg) {
	console.info(`XG variation 1: ${msg}`);
}).register([67, 16, 76, 2, 1, 68], function (msg) {
	console.info(`XG variation 2: ${msg}`);
}).register([67, 16, 76, 2, 1, 70], function (msg) {
	console.info(`XG variation 3: ${msg}`);
}).register([67, 16, 76, 2, 1, 72], function (msg) {
	console.info(`XG variation 4: ${msg}`);
}).register([67, 16, 76, 2, 1, 74], function (msg) {
	console.info(`XG variation 5: ${msg}`);
}).register([67, 16, 76, 2, 1, 76], function (msg) {
	console.info(`XG variation 6: ${msg}`);
}).register([67, 16, 76, 2, 1, 78], function (msg) {
	console.info(`XG variation 7: ${msg}`);
}).register([67, 16, 76, 2, 1, 80], function (msg) {
	console.info(`XG variation 8: ${msg}`);
}).register([67, 16, 76, 2, 1, 82], function (msg) {
	console.info(`XG variation 9: ${msg}`);
}).register([67, 16, 76, 2, 1, 84], function (msg) {
	console.info(`XG variation 10: ${msg}`);
}).register([67, 16, 76, 2, 1, 86], function (msg) {
	console.info(`XG variation return: ${getDecibel(msg[0])}dB`);
}).register([67, 16, 76, 2, 1, 87], function (msg) {
	console.info(`XG variation pan: ${textedPanning(msg[0])}`);
}).register([67, 16, 76, 2, 1, 88], function (msg) {
	console.info(`XG variation to reverb: ${getDecibel(msg[0])}dB`);
}).register([67, 16, 76, 2, 1, 89], function (msg) {
	console.info(`XG variation to chorus: ${getDecibel(msg[0])}dB`);
}).register([67, 16, 76, 2, 1, 90], function (msg) {
	console.info(`XG variation connection: ${msg[0] ? "system" : "insertion"}`);
}).register([67, 16, 76, 2, 1, 91], function (msg) {
	console.info(`XG variation part: ${msg}`);
}).register([67, 16, 76, 2, 1, 92], function (msg) {
	console.info(`XG variation mod wheel: ${textedPitchBend(msg[0])}`);
}).register([67, 16, 76, 2, 1, 93], function (msg) {
	console.info(`XG variation bend wheel: ${textedPitchBend(msg[0])}`);
}).register([67, 16, 76, 2, 1, 94], function (msg) {
	console.info(`XG variation channel after touch: ${msg[0] - 64}`);
}).register([67, 16, 76, 2, 1, 95], function (msg) {
	console.info(`XG variation AC1: ${msg[0] - 64}`);
}).register([67, 16, 76, 2, 1, 96], function (msg) {
	console.info(`XG variation AC2: ${msg[0] - 64}`);
}).register([67, 16, 76, 8], function (msg, channel, time) {
	// XG part setup
	xgPartConf.run(msg.slice(1), msg[0] + 1, time);
});
// Roland MT-32 SysEx
sysEx.register([65, 1, 22, 18, 2, 0, 0], function (msg) {
	mt32ToneProp(1, msg);
}).register([65, 2, 22, 18, 2, 0, 0], function (msg) {
	mt32ToneProp(2, msg);
}).register([65, 3, 22, 18, 2, 0, 0], function (msg) {
	mt32ToneProp(3, msg);
}).register([65, 4, 22, 18, 2, 0, 0], function (msg) {
	mt32ToneProp(4, msg);
}).register([65, 5, 22, 18, 2, 0, 0], function (msg) {
	mt32ToneProp(5, msg);
}).register([65, 6, 22, 18, 2, 0, 0], function (msg) {
	mt32ToneProp(6, msg);
}).register([65, 7, 22, 18, 2, 0, 0], function (msg) {
	mt32ToneProp(7, msg);
}).register([65, 8, 22, 18, 2, 0, 0], function (msg) {
	mt32ToneProp(8, msg);
}).register([65, 9, 22, 18, 2, 0, 0], function (msg) {
	mt32ToneProp(9, msg);
});
// XG Part Setup
xgPartConf.register([0], function (msg, channel) {
	console.info(`XG Part reserve ${msg[0]} elements for channel ${channel}.`);
}).register([7], function (msg, channel) {
	console.info(`XG Part use mode "${xgPartMode[msg[0]]}" for channel ${channel}.`);
}).register([14], function (msg, channel) {
	console.info(`XG Part panning for channel ${channel}: ${textedPanning(msg[0])}.`);
}).register([17], function (msg, channel) {
	console.info(`XG Part dry level ${msg[0]} for channel ${channel}.`);
}).register([21], function (msg, channel) {
	console.info(`XG Part LFO speed ${msg[0]} for channel ${channel}.`);
}).register([29], function (msg, channel) {
	console.info(`XG Part MW bend ${msg[0] - 64} semitones for channel ${channel}.`);
}).register([32], function (msg, channel) {
	console.info(`XG Part MW LFO pitch depth ${msg[0]} for channel ${channel}.`);
}).register([33], function (msg, channel) {
	console.info(`XG Part MW LFO filter depth ${msg[0]} for channel ${channel}.`);
}).register([35], function (msg, channel) {
	console.info(`XG Part bend pitch ${msg[0] - 64} semitones for channel ${channel}.`);
}).register([105], function (msg, channel) {
	console.info(`XG Part EG initial ${msg[0] - 64} for channel ${channel}.`);
}).register([106], function (msg, channel) {
	console.info(`XG Part EG attack time ${msg[0] - 64} for channel ${channel}.`);
});

let curFps = 0, lastFrame = Date.now();
self.task = setInterval(function () {
	curFps = Math.round(1000 / (Date.now() - lastFrame));
	if (self.midiEventPool && audioPlayer.reallyPlaying) {
		self.midiEvents = midiEventPool.list.at(audioPlayer.currentTime - audioDelay);
		let progressNotes = (audioPlayer.currentTime - audioDelay) / musicBInt, totalNotes = progressNotes - barOffsetNotes;
		curBar = Math.floor(totalNotes / musicNomin), curBeat = Math.floor(totalNotes % musicNomin);
		polyphony = 0;
		midiEvents.forEach(function (f) {
			let e = f.data;
			switch (e.type) {
				case 255: {
					switch (e.meta) {
						case 88: {
							// Time signature
							let oldNomin = musicNomin;
							let oldDenom = musicDenom;
							musicNomin = e.data[0];
							musicDenom = 1 << e.data[1];
							let metronomClick = 24 * (32 / e.data[3]) / e.data[2];
							if (oldNomin != musicNomin) {
								if (curBeat < 1) {
									barOffsetNotes += progressNotes - (curBar * musicNomin + curBeat);
								} else {
									barOffsetNotes += progressNotes - (curBar + 1) * musicNomin;
								};
							};
							break;
						};
						case 81: {
							// Switch tempo
							let lastBint = musicBInt || 120;
							musicTempo = 60000000 / e.data;
							musicBInt = e.data / 1000000;
							barOffsetNotes += progressNotes * lastBint / musicBInt - progressNotes;
							break;
						};
						case 84: {
							// SMPTE offset change
							let hourByte = e.data[0];
							let setFps = [24, 25, 29.97, 30][(hourByte >> 7 << 2) ^ (hourByte >> 5)];
							let setH = (hourByte >> 5 << 5) ^ hourByte;
							let setM = e.data[1], setS = e.data[2], setF = e.data[3], setSf = e.data[4];
							break;
						};
						case 89: {
							// Key Signature
							curKey = (e.data[0] + 12) % 12 || 0;
							curScale = e.data[1] || 0;
							break;
						};
						case 33: {
							// I don't know what it does, really. Just that the Monkey Island MIDI file appeared this.
							/*if (midiMode != 3) {
								textData += `\nRoland MT-32 detected via meta events.`;
							};
							midiMode = midiMode || 3;
							subMsb = 127, subLsb = 127;*/
							break;
						};
						case 47: {
							// End of track
							//textField.innerHTML += `End of track: ${audioPlayer.currentTime}.\n`;
							break;
						};
						case 127: {
							// Sequencer specific
							break;
						};
						case 1: {
							// Common text
							let unparsed = e.data || "", parsed = `${unparsed}`;
							if (!karaokeMode) {
								parsed = `\n${parsed}`;
							};
							switch (unparsed[0]) {
								case "/":
								case "\\": {
									// Karaoke
									if (karaokeMode) {
										parsed = `\n${unparsed.slice(1)}`;
									};
									break;
								};
								case "@": {
									parsed = "";
									if (unparsed[1] == "K") {
										// Start karaoke mode
										karaokeMode = true;
										nearestEvent = "Karaoke Mode";
									} else if (karaokeMode) {
										if (unparsed[1] == "L") {
											// Karaoke language
											parsed = `\n  K.Lang: ${unparsed.slice(2)}`;
										} else if (unparsed[1] == "T") {
											// Karaoke title
											parsed = `\n K.Title: ${unparsed.slice(3)}`;
										};
									};
									break;
								};
							};
							textData += `${parsed}`;
							break;
						};
						case 3: {
							// Track name
							if (!trkName) {
								trkName = e.data;
							} else {
								textData += `\nTrk Info: ${e.data}`
							};
							break;
						};
						default: {
							let temporalDisplay = e.data || "";
							textData += `\n${metaType[e.meta] || e.meta || "Empty meta."}${temporalDisplay ? ":" : "!"} ${temporalDisplay}`;
						};
					};
					break;
				};
				case 8: {
					// Note off
					if (pressedNotes[e.meta] && pressedNotes[e.meta].length > 0) {
						let foundIndex = pressedNotes[e.meta].indexOf(e.data[0]);
						pressedNotes[e.meta].splice(foundIndex, 1);
						altPoly --;
					};
					break;
					if (maxPoly < Math.max(altPoly, polyphony)) {
						maxPoly = Math.max(altPoly, polyphony);
					};
				};
				case 9: {
					// Note on/state change
					if (e.data[1] < 3) {
						if (pressedNotes[e.meta] && pressedNotes[e.meta].length > 0) {
							let foundIndex = pressedNotes[e.meta].indexOf(e.data[0]);
							pressedNotes[e.meta].splice(foundIndex, 1);
							altPoly --;
						};
					} else {
						if (!pressedNotes[e.meta]) {
							pressedNotes[e.meta] = [];
							pressedNotes[e.meta].vol = 100;
							pressedNotes[e.meta].exp = 127;
							pressedNotes[e.meta].pan = 64;
							if (e.meta == 9) {
								switch (midiMode) {
									case 4:
									case 6: {
										pressedNotes[e.meta].lsb = 120;
										pressedNotes[e.meta].msb = 0;
										break;
									};
									default: {
										pressedNotes[e.meta].msb = 127;
									};
								};
							};
						};
						if (pressedNotes[e.meta].indexOf(e.data[0]) == -1) {
							pressedNotes[e.meta].push(e.data[0]);
						};
						altPoly ++;
					};
					if (maxPoly < Math.max(altPoly, polyphony)) {
						maxPoly = Math.max(altPoly, polyphony);
					};
					break;
				};
				case 10: {
					// Note aftertouch (state change)
					console.warn(e);
					break;
				};
				case 11: {
					// Channel control
					if (!pressedNotes[e.meta]) {
						pressedNotes[e.meta] = [];
						pressedNotes[e.meta].vol = 100;
						pressedNotes[e.meta].exp = 127;
						pressedNotes[e.meta].pan = 64;
						if (e.meta == 9) {
							switch (midiMode) {
								case 4:
								case 6: {
									pressedNotes[e.meta].lsb = 120;
									pressedNotes[e.meta].msb = 0;
									break;
								};
								default: {
									pressedNotes[e.meta].msb = 127;
								};
							};
						};
					};
					switch (e.data[0]) {
						case 0: {
							// MSB bank select
							// LSB bank select could have problems
							if (midiMode) {
								pressedNotes[e.meta].msb = e.data[1];
							} else {
								switch (e.data[1]) {
									case 0: {
										// Melodic voices. Might be Yamaha XG. Do nothing.
										break;
									};
									case 64: // XG SFX
									case 126: // XG SFX Kits
									case 127: { // XG Drum Kits
										midiMode = 5;
										pressedNotes[e.meta].msb = e.data[1];
										textData += `\nYamaha XG detected via MSB select.`;
										break;
									};
									case 56: // KORG AG-10
									case 61: // KORG Drum Kits
									case 62: // KORG Drum Kits
									case 81: // KORG 05R/W
									case 82: // KORG X5D
									case 83: // KORG "ProgC"
									case 89: // KORG "CmbA"
									case 90: // KORG "CmbB"
									case 91: { // KORG "CmbC"
										midiMode = 2;
										pressedNotes[e.meta].msb = e.data[1];
										textData += `\nKORG AI2 detected via MSB select.`;
										break;
									};
									default: {
										// Must be Roland GS.
										midiMode = 4;
										pressedNotes[e.meta].msb = e.data[1];
										textData += `\nRoland GS detected via MSB select.`;
									};
								};
							};
							break;
						};
						case 1: {
							// Modulation
							pressedNotes[e.meta].mod = e.data[1];
							break;
						};
						case 2: {
							// Breath
							pressedNotes[e.meta].brt = e.data[1];
							break;
						};
						case 4: {
							// Foot
							pressedNotes[e.meta].fot = e.data[1];
							break;
						};
						case 5: {
							// Portamento time
							pressedNotes[e.meta].por = e.data[1];
						};
						case 7: {
							// Volume
							pressedNotes[e.meta].vol = e.data[1];
							break;
						};
						case 8: {
							// Balance
							pressedNotes[e.meta].bal = e.data[1];
							break;
						};
						case 10: {
							// Pan
							pressedNotes[e.meta].pan = e.data[1];
							break;
						};
						case 11: {
							// Expression
							pressedNotes[e.meta].exp = e.data[1];
							break;
						};
						case 32: {
							// LSB bank select
							pressedNotes[e.meta].lsb = e.data[1];
							break;
						};
						case 64: {
							// Damper
							pressedNotes[e.meta].dpp = e.data[1];
							break;
						};
						case 65: {
							// Portamento
							pressedNotes[e.meta].pon = e.data[1];
							break;
						};
						case 66: {
							// Sostenuto
							pressedNotes[e.meta].sos = e.data[1];
							break;
						};
						case 67: {
							// Damper
							pressedNotes[e.meta].dpp = e.data[1];
							break;
						};
						case 68: {
							// Soft pedal
							pressedNotes[e.meta].ped = e.data[1];
							break;
						};
						case 69: {
							// Legato
							pressedNotes[e.meta].leg = e.data[1];
							break;
						};
						case 70: {
							// Hold 2
							pressedNotes[e.meta].hol = e.data[1];
							break;
						};
						case 71: {
							// Harmonic
							pressedNotes[e.meta].har = e.data[1];
							break;
						};
						case 72: {
							// Release time
							pressedNotes[e.meta].rls = e.data[1];
							break;
						};
						case 73: {
							// Attack time
							pressedNotes[e.meta].atk = e.data[1];
							break;
						};
						case 74: {
							// Brightness
							pressedNotes[e.meta].brt = e.data[1];
							break;
						};
						case 75: {
							// Decay
							pressedNotes[e.meta].dcy = e.data[1];
							break;
						};
						case 91: {
							// Reverb
							pressedNotes[e.meta].rev = e.data[1];
							break;
						};
						case 92: {
							// Tremelo
							pressedNotes[e.meta].tre = e.data[1];
							break;
						};
						case 93: {
							// Chorus
							pressedNotes[e.meta].cho = e.data[1];
							break;
						};
						case 94: {
							// Detune/celeste
							pressedNotes[e.meta].det = e.data[1];
							break;
						};
						case 95: {
							// Phaser
							pressedNotes[e.meta].pha = e.data[1];
							break;
						};
						case 121: {
							// Controller reset
							//textField.innerHTML += "Controller has reset.\n";
							break;
						};
						default: {
							console.debug(JSON.stringify(e));
						};
					};
					break;
				};
				case 12: {
					// Program change
					if (!pressedNotes[e.meta]) {
						pressedNotes[e.meta] = [];
						pressedNotes[e.meta].vol = 100;
						pressedNotes[e.meta].exp = 127;
						pressedNotes[e.meta].pan = 64;
						if (e.meta == 9) {
							if (midiMode == 0) {
								// GS/XG detection based on program selection
								switch (e.data) {
									case 0:
									case 8:
									case 16:
									case 24:
									case 25:
									case 32:
									case 40:
									case 48: {
										// Does nothing
										break;
									};
									case 56:
									case 127: {
										midiMode = 4;
										textData += `\nRoland GS detected via drum kit.`;
										break;
									};
									default: {
										midiMode = 5;
										textData += `\nYamaha XG detected via drum kit.`;
									};
								};
							};
							switch (midiMode) {
								case 4:
								case 6: {
									pressedNotes[e.meta].lsb = 120;
									pressedNotes[e.meta].msb = 0;
									break;
								};
								default: {
									pressedNotes[e.meta].msb = 127;
								};
							};
						};
					};
					pressedNotes[e.meta].prg = e.data;
					break;
				};
				case 13: {
					// Channel aftertouch (state change)
					console.warn(e);
					break;
				};
				case 14: {
					// Channel pitch bend
					if (!pressedNotes[e.meta]) {
						pressedNotes[e.meta] = [];
					};
					pressedNotes[e.meta].npb = e.data;
					break;
				};
				case 15: {
					// MIDI SysEx messages
					let msg = e.data.slice(0, e.data.length - 1);
					//console.warn(msg);
					sysEx.run(msg, e.meta, audioPlayer.currentTime);
				};
			};
		});
		pressedNotes.forEach(function (e0) {
			polyphony += e0.length;
		});
		registerDisp.innerHTML = `Event:${midiEvents.length.toString().padStart(3, "0")} Poly:${Math.max(polyphony, 0).toString().padStart(3, "0")}(${Math.max(maxPoly, 0).toString().padStart(3, "0")})/${midiModeName[2][midiMode].toString().padStart(3, "0")} TSig:${musicNomin}/${musicDenom} Bar:${(Math.max(0, curBar) + 1).toString().padStart(3, "0")}/${Math.max(0, curBeat) + 1} Tempo:${trailPt(Math.round(musicTempo * 100) / 100)} Vol:${trailPt(masterVol, 1, 1)}%\nMode:${midiModeName[1][midiMode]} Time:${Math.floor(audioPlayer.currentTime / 60).toString().padStart(2,"0")}:${Math.floor(audioPlayer.currentTime % 60).toString().padStart(2,"0")}.${Math.round((audioPlayer.currentTime) % 1 * 1000).toString().padStart(3,"0")} Key:CM${trkName ? " Title:" + trkName : ""}${nearestEvent ? " Ext:" + nearestEvent : ""}\n\nCH:Ch.Voice#St BVE RCVTBD PPP M Pi Pan : Note\n`;
		pressedNotes.forEach(function (e0, i) {
			registerDisp.innerHTML += `${(i+1).toString().padStart(2, "0")}:${(midiMode == 3 && e0.npg == (e0.prg || 0)) ? e0.nme?.trimEnd().slice(0, 8) + "~" || "NmeUnset" : self.getSoundBank && self.getSoundBank(e0.msb || getMsb(midiMode, i) || subMsb, e0.prg, e0.lsb || subLsb).padEnd(9, " ") || "Unknown "}${getStd(e0.msb || subMsb, e0.prg, e0.lsb || subLsb)} ${map[(e0.bal || 0) >> 1]}${map[(e0.vol || 0) >> 1]}${map[(e0.exp || 0) >> 1]} ${map[(e0.rev || 0) >> 1]}${map[(e0.cho || 0) >> 1]}${map[(e0.var || 0) >> 1]}${map[(e0.tre || 0) >> 1]}${map[(e0.brt > -1 ? e0.brt : 127) >> 1]}${map[(e0.det || 0) >> 1]} ${map[(e0.ped || 0) >> 1]}${(e0.pon >= 64 ? "O" : "X")}${map[(e0.por || 0) >> 1]} ${((e0.mod || 0) >> 6 > 0) ? "|" : ((e0.mod || 0) >> 4 > 0 ? "~" : "-")} ${textedPitchBend(e0.npb || [0, 64])} ${textedPanning(e0.pan == undefined ? 0 : e0.pan)}: `;
			Array.from(e0).sort(function (a, b) {return Math.sign(a - b)}).forEach(function (e1) {
				registerDisp.innerHTML += `${noteNames[e1%12]}${noteRegion[Math.floor(e1/12)]} `;
			});
			registerDisp.innerHTML += `\n`;
		});
		if (Math.abs(lastDispTime - audioPlayer.currentTime) < 3.2) {
			// Highlight the letter display
			xgLetterDisp.className = "invert";
		} else {
			// Return it to normal
			xgLetterDisp.className = "";
			xgLetterDisp.innerText = "                \n                ";
		};
		// Limit maximum lines available for text display
		textField.innerHTML = "";
		let origText = textData.split("\n"), intrText = [], newText = "", limitLine = 23 - pressedNotes.length;
		if (xgLetterDisp.innerHTML) {
			limitLine -= 2;
		};
		origText.forEach(function (e) {
			if (e.trim().length > 0) {
				intrText.push(e);
			};
		});
		if (intrText.length > limitLine) {
			intrText = origText.slice(intrText.length - limitLine + 1);
		};
		intrText.forEach(function (e) {
			textField.innerHTML += `${e}\n`;
		});
		// Bitmap display experiment
		bitmapDisp.fillStyle = "#000";
		bitmapDisp.fillRect(0, 0, 192, 96);
		bitmapDisp.fillStyle = "#ddd";
		if (Math.abs(audioPlayer.currentTime - lastBmTime) < (musicNomin * musicBInt) << 4) {
			trueBitmap.forEach(function (e, i) {
				if (e) {
					bitmapDisp.fillRect((i % 16) * 12, Math.floor(i / 16) * 6, 10, 4);
				};
			});
		};
	};
	lastFrame = Date.now();
}, 1000/50);
