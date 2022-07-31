"use strict";

let midiBlob, midiBuffer, midiJson, msgPort;
const map = "0123456789_aAbBcCdDeEfFgGhHiIjJ-kKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ";

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

renewBankMap("xg");
setInterval(function () {
	renewBankMap("xg");
}, 5000);
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
const midiModeName = [["??", "GM", "??", "MT", "GS", "XG", "G2"], [
	"UnkwnStd",
	"GnrlMIDI",
	"UnusedId",
	"RlndMT32",
	"RolandGS",
	"YamahaXG",
	"GenMIDI2"
]];
const scales = ["M", "m"];
let musicTempo = 120, musicBInt = 0.5, musicNomin = 4, musicDenom = 4, curBar = 0, curBeat = 0, curBeatFloat = 0;
let curKey = 0, curScale = 0;
let polyphony = 0, altPoly = 0, maxPoly = 0, masterVol = 100;
let midiMode = 0, lastDispTime = -5, barOffsetNotes = 0, karaokeMode = false;
let textData = "", trkName = "";
self.pressedNotes = [];
let bitmapDisp = $e("canvas").getContext("2d");
let trueBitmap = [], lastBmTime = 0;

// Initialize bitmap
bitmapDisp.fillStyle = "#fff";

// MIDI SysEx execution pool
let sysEx = new prefMatch();
sysEx.default = function (prefix, channel, time) {
	console.warn(prefix, channel, time);
};
sysEx.register([126, 127, 9, 1], function () {
	// General MIDI reset
	midiMode = 1;
}).register([126, 127, 9, 1], function () {
	// General MIDI rev. 2 reset
	midiMode = 6;
}).register([65, 16, 22, 18, 127, 1], function () {
	// MT-32 reset
	midiMode = 3;
}).register([65, 16, 66, 18], function (msg) {
	// Roland GS reset
	midiMode = 4;
	console.info(`Roland GS reset: ${msg}`);
}).register([67, 16, 76, 0, 0, 126, 0], function (msg) {
	// Yamaha XG reset
	midiMode = 5;
});
// General MIDI SysEx messages
sysEx.register([127, 127, 4, 1], function (msg) {
	// Master volume
	midiMode = 1;
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
});

self.task = setInterval(function () {
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
							musicNomin = e.data[0];
							musicDenom = 1 << e.data[1];
							let metronomClick = 24 * (32 / e.data[3]) / e.data[2];
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
						pressedNotes[e.meta].push(e.data[0]);
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
										// Might be Yamaha XG. Do nothing.
										break;
									};
									case 64:
									case 126:
									case 127: {
										midiMode = 5;
										pressedNotes[e.meta].msb = e.data[1];
										textData += `\nYamaha XG detected via MSB select.`;
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
							if (midiMode == 5) {
								pressedNotes[e.meta].lsb = e.data[1];
							};
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
							if (!midiMode) {
								midiMode = 1;
							};
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
		registerDisp.innerHTML = `Event:${midiEvents.length.toString().padStart(3, "0")} Poly:${Math.max(polyphony, 0).toString().padStart(3, "0")}(${Math.max(maxPoly, 0).toString().padStart(3, "0")})/256 TSig:${musicNomin}/${musicDenom} Bar:${(Math.max(0, curBar) + 1).toString().padStart(3, "0")}/${Math.max(0, curBeat) + 1} Tempo:${trailPt(Math.round(musicTempo * 100) / 100)} Vol:${trailPt(masterVol, 1, 1)}%\nMode:${midiModeName[1][midiMode]} Time:${Math.floor(audioPlayer.currentTime / 60).toString().padStart(2,"0")}:${Math.floor(audioPlayer.currentTime % 60).toString().padStart(2,"0")}.${Math.round((audioPlayer.currentTime) % 1 * 1000).toString().padStart(3,"0")} Key:${noteShnms[curKey]}${scales[curScale]}${trkName ? " Title:" + trkName : ""}${nearestEvent ? " Ext:" + nearestEvent : ""}\n\nCH:Ch.Voice BVE RCVTD PPP M PI PAN : NOTE\n`;
		pressedNotes.forEach(function (e0, i) {
			registerDisp.innerHTML += `${(i+1).toString().padStart(2, "0")}:${self.getSoundBank && (midiMode != 4 ? self.getSoundBank(e0.msb, e0.prg, e0.lsb) : self.getSoundBank(e0.lsb, e0.prg, e0.msb)).padEnd(8, " ") || "Unknown "} ${map[(e0.bal || 0) >> 1]}${map[(e0.vol || 0) >> 1]}${map[(e0.exp || 0) >> 1]} ${map[(e0.rev || 0) >> 1]}${map[(e0.cho || 0) >> 1]}${map[(e0.var || 0) >> 1]}${map[(e0.tre || 0) >> 1]}${map[(e0.det || 0) >> 1]} ${map[(e0.ped || 0) >> 1]}${(e0.pon >= 64 ? "O" : "X")}${map[(e0.por || 0) >> 1]} ${((e0.mod || 0) >> 6 > 0) ? "|" : ((e0.mod || 0) >> 4 > 0 ? "~" : "-")} ${textedPitchBend(e0.npb || [0, 64])} ${textedPanning(e0.pan == undefined ? 0 : e0.pan)}: `;
			Array.from(e0).sort(function (a, b) {return Math.sign(a - b)}).forEach(function (e1) {
				registerDisp.innerHTML += `${noteNames[e1%12]}${Math.floor(e1/12)} `;
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
}, 1000/50);
