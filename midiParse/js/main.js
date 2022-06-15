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
							//textField.innerHTML += `Time sig is ${e.data[0]}/${musicDenom}, metronom clicks ${metronomClick} times per full note.\n`;
							break;
						};
						case 81: {
							// Switch tempo
							let lastBint = musicBInt || 120;
							musicTempo = 60000000 / e.data;
							musicBInt = e.data / 1000000;
							barOffsetNotes += progressNotes * lastBint / musicBInt - progressNotes;
							//textField.innerHTML += `Tempo switched to ${musicTempo} bpm\n`;
							break;
						};
						case 84: {
							// SMPTE offset change
							let hourByte = e.data[0];
							let setFps = [24, 25, 29.97, 30][(hourByte >> 7 << 2) ^ (hourByte >> 5)];
							let setH = (hourByte >> 5 << 5) ^ hourByte;
							let setM = e.data[1], setS = e.data[2], setF = e.data[3], setSf = e.data[4];
							//textField.innerHTML += `SMPTE set to ${setFps} FPS, ${setH.toString().padStart(2, "0")}:${setM.toString().padStart(2, "0")}:${setS.toString().padStart(2, "0")}/${setF.toString().padStart(2, "0")}.${setSf.toString().padStart(2, "0")}\n`;
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
							if (e.meta == 9) {
								switch (midiMode) {
									case 4:
									case 6: {
										pressedNotes[e.meta].lsb = 127;
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
						if (e.meta == 9) {
							switch (midiMode) {
								case 4:
								case 6: {
									pressedNotes[e.meta].lsb = 127;
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
							if (midiMode) {
								pressedNotes[e.meta].msb = e.data[1];
							} else {
								switch (e.data) {
									case 0:
									case 64:
									case 126:
									case 127: {
										// Might be Yamaha XG. Do nothing.
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
						case 70: {
							// Variation
							pressedNotes[e.meta].var = e.data[1];
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
									pressedNotes[e.meta].lsb = 127;
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
					let msg = Array.from(e.data.slice((e.data[0] != 0 ? 1 : 3), e.data.length - 1));
					switch (e.data[0]) {
						case 65: {
							// Roland Corporation
							switch (msg[0]) {
								case 16: {
									if (sameArray(msg.slice(1), [22, 18, 127, 1])) {
										// MT-32 reset
										midiMode = 3;
									} else if (sameArray(msg.slice(1, 3), [66, 18])) {
										// GS reset
										midiMode = 4;
									} else {
										console.error(audioPlayer.currentTime, msg);
									};
									break;
								};
								default: {
									console.error(audioPlayer.currentTime, msg);
								};
							};
							break;
						};
						case 66: {
							// Korg Inc.
							console.warn(audioPlayer.currentTime, e);
							break;
						};
						case 67: {
							// Yamaha Corporation
							switch (msg[0]) {
								case 16: {
									if (sameArray(msg.slice(1), [0x4c, 0, 0, 126, 0])) {
										// XG reset
										midiMode = 5;
									} else if (sameArray(msg.slice(1, 4), [76, 6, 0])) {
										// XG letter display
										let offset = msg[4], targetText = Array.from("                \n                ");
										msg.slice(5).forEach(function (e1, i1, a1) {
											let pointer = i1 + offset;
											targetText[pointer + Math.floor(pointer / 16)] = String.fromCharCode(e1);
										});
										xgLetterDisp.innerHTML = targetText.join("");
										lastDispTime = audioPlayer.currentTime;
									} else {
										console.error(audioPlayer.currentTime, msg);
									};
									break;
								};
								default: {
									console.error(audioPlayer.currentTime, msg);
								};
							};
							break;
						};
						case 126: {
							// General MIDI extension
							switch (msg[0]) {
								case 127: {
									if (sameArray(msg.slice(1), [9, 1])) {
										// General MIDI reset
										midiMode = 1;
									} else if (sameArray(msg.slice(2), [9, 3])) {
										// General MIDI 2 reset
										midiMode = 6;
									} else {
										console.error(audioPlayer.currentTime, msg);
									};
									break;
								};
								default: {
									console.error(audioPlayer.currentTime, msg);
								};
							};
							break;
						};
						case 127: {
							// General MIDI extension
							switch (msg[0]) {
								case 127: {
									if (sameArray(msg.slice(1, 3), [4, 1])) {
										// General MIDI master volume change
										masterVol = ((msg[4] << 7) + msg[3]) / 163.83;
									} else {
										console.error(audioPlayer.currentTime, msg);
									};
									break;
								};
								default: {
									console.error(audioPlayer.currentTime, msg);
								};
							};
							break;
						};
						default: {
							console.warn(audioPlayer.currentTime, e);
						};
					};
				};
			};
		});
		pressedNotes.forEach(function (e0) {
			polyphony += e0.length;
		});
		registerDisp.innerHTML = `Event:${midiEvents.length.toString().padStart(3, "0")} Poly:${Math.max(polyphony, 0).toString().padStart(3, "0")}(${Math.max(maxPoly, 0).toString().padStart(3, "0")})/256 Bar:${(Math.max(0, curBar) + 1).toString().padStart(3, "0")}/${Math.max(0, curBeat) + 1} TSig:${musicNomin}/${musicDenom} Vol:${trailPt(masterVol, 1, 1)}% Tempo:${trailPt(Math.round(musicTempo * 100) / 100)}\nMode:${midiModeName[1][midiMode]} Time:${Math.floor(audioPlayer.currentTime / 60).toString().padStart(2,"0")}:${Math.floor(audioPlayer.currentTime % 60).toString().padStart(2,"0")}.${Math.round((audioPlayer.currentTime) % 1 * 1000).toString().padStart(3,"0")} Key:${noteShnms[curKey]}${scales[curScale]}${trkName ? " Title:" + trkName : ""}${nearestEvent ? " Ext:" + nearestEvent : ""}\n\nCH:Ch.Voice BVE RCVTD M PI PAN : NOTE\n`;
		pressedNotes.forEach(function (e0, i) {
			registerDisp.innerHTML += `${(i+1).toString().padStart(2, "0")}:${self.getSoundBank && (midiMode != 4 ? self.getSoundBank(e0.msb, e0.prg, e0.lsb) : self.getSoundBank(e0.lsb, e0.prg, e0.msb)).padEnd(8, " ") || "Unknown "} ${map[(e0.bal || 0) >> 1]}${map[(e0.vol || 0) >> 1]}${map[(e0.exp || 0) >> 1]} ${map[(e0.rev || 0) >> 1]}${map[(e0.cho || 0) >> 1]}${map[(e0.var || 0) >> 1]}${map[(e0.tre || 0) >> 1]}${map[(e0.det || 0) >> 1]} ${((e0.mod || 0) >> 6 > 0) ? "|" : ((e0.mod || 0) >> 4 > 0 ? "~" : "-")} ${textedPitchBend(e0.npb || [0, 64])} ${textedPanning(e0.pan == undefined ? 0 : e0.pan)}: `;
			Array.from(e0).sort().forEach(function (e1) {
				registerDisp.innerHTML += `${noteNames[e1%12]}${Math.floor(e1/12)} `;
			});
			registerDisp.innerHTML += `\n`;
		});
		if (Math.abs(lastDispTime - audioPlayer.currentTime) < 3.2767) {
			// Highlight the letter display
			xgLetterDisp.className = "invert";
		} else {
			// Return it to normal
			xgLetterDisp.className = "";
		};
		// Limit maximum lines available for text display
		textField.innerHTML = "";
		let origText = textData.split("\n"), intrText = [], newText = "", limitLine = 23 - pressedNotes.length;
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
	};
}, 1000/30);
