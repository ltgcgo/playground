"use strict";

let midiBlob, midiBuffer, midiJson, msgPort;
const map = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";

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

// How much pitch bending?
let textedPitchBend = function (number) {
	let normalized = (number[1] % 128 * 128 + number[0]) - 8192;
	let result = "--";
	if (normalized > 0) {
		result = (normalized > 4095) ? ">>" : ">-" ;
	} else if (normalized < 0) {
		result = (normalized < -4096) ? "<<" : "-<" ;
	};
	return result;
};
let textedPanning = function (number) {
	let normalized = number - 64;
	let result = Array.from("----");
	if (normalized > 0) {
		for (let c = 0; c < Math.ceil(normalized / 16); c ++) {
			result[c] = ">";
		};
	} else if (normalized < 0) {
		for (let c = 3; c >= (4 + Math.floor(normalized / 16)); c --) {
			result[c] = "<";
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
	midiBlob = data.data;
	midiBuffer = await getBuffer(midiBlob);
	midiJson = MidiParser.parse(new Uint8Array(midiBuffer));
	self.midiEventPool = new MidiEventPool(midiJson);
};

{
	// Send and receive messages
	self.msgId = randomID(16);
	msgPort = new BroadcastChannel(msgId);
	msgPort.onmessage = async function (data) {
		setMidi(data);
	};
};

fetch("./demo/Sam Sketty - Low Down.mid").then(function (response) {return response.blob()}).then(function (blob) {setMidi({data: blob})});

let textField = $e("#textField");
let audioPlayer = $e("audio");
let registerDisp = $e("#register");
let audioDelay = 1.58;
audioPlayer.src = "./demo/Sam Sketty - Low Down.opus";
audioPlayer.onplaying = function () {
	//textField.innerHTML = "";
	this.reallyPlaying = true;
	pressedNotes = [];
	polyphony = 0, maxPoly = 0;
	registerDisp.innerHTML = "Empty register";
	midiEventPool.list.resetPointer(0);
	midiEventPool.list.pointSpan = 0.5;
};
audioPlayer.onplay = function () {
	if (this.ended) {
		textField.innerHTML = "";
	};
};
audioPlayer.onpause = function () {
	this.reallyPlaying = false;
};
const noteNames = ["C~", "C#", "D~", "Eb", "E~", "F~", "F#", "G~", "Ab", "A~", "Bb", "B~"], metaType = ["SEQUENCE_NUM", "COMMON_TEXT ", "COPYRIGHT   ", "TRACK_NAME  ", "INSTRUMENT  ", "COMON_LYRICS", "COMON_MARKER", "CM_CUE_POINT"];
let musicTempo = 120, musicBInt = 0.5, musicNomin = 2, musicDenom = 4, curBar = 0, curBeat = 0;
let polyphony = 0, maxPoly = 0;
self.pressedNotes = [];
self.task = setInterval(function () {
	if (self.midiEventPool && audioPlayer.reallyPlaying) {
		self.midiEvents = midiEventPool.list.at(audioPlayer.currentTime - audioDelay);
		let totalNotes = Math.floor((audioPlayer.currentTime - audioDelay) / musicBInt);
		curBar = Math.floor(totalNotes / musicNomin), curBeat = (totalNotes % musicNomin);
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
							textField.innerHTML += `Time sig is ${e.data[0]}/${musicDenom}, metronom clicks ${metronomClick} times per full note.\n`;
							break;
						};
						case 81: {
							// Switch tempo
							musicTempo = 60000000 / e.data;
							musicBInt = e.data / 1000000;
							textField.innerHTML += `Tempo switched to ${musicTempo} bpm\n`;
							break;
						};
						case 84: {
							// SMPTE offset change
							let hourByte = e.data[0];
							let setFps = [24, 25, 29.97, 30][(hourByte >> 7 << 2) ^ (hourByte >> 5)];
							let setH = (hourByte >> 5 << 5) ^ hourByte;
							let setM = e.data[1], setS = e.data[2], setF = e.data[3], setSf = e.data[4];
							textField.innerHTML += `SMPTE set to ${setFps} FPS, ${setH.toString().padStart(2, "0")}:${setM.toString().padStart(2, "0")}:${setS.toString().padStart(2, "0")}/${setF.toString().padStart(2, "0")}.${setSf.toString().padStart(2, "0")}\n`;
							break;
						};
						default: {
							textField.innerHTML += `${metaType[e.meta]}: ${e.data || ""}\n`;
						};
					};
					break;
				};
				case 8: {
					if (pressedNotes[e.meta] && pressedNotes[e.meta].length > 0) {
						let foundIndex = pressedNotes[e.meta].indexOf(e.data[0]);
						pressedNotes[e.meta].splice(foundIndex, 1);
					};
					break;
				};
				case 9: {
					if (e.data[1] < 3) {
						if (pressedNotes[e.meta] && pressedNotes[e.meta].length > 0) {
							let foundIndex = pressedNotes[e.meta].indexOf(e.data[0]);
							pressedNotes[e.meta].splice(foundIndex, 1);
						};
					} else {
						if (!pressedNotes[e.meta]) {
							pressedNotes[e.meta] = [];
						};
						pressedNotes[e.meta].push(e.data[0])
					};
					break;
				};
				case 11: {
					if (!pressedNotes[e.meta]) {
						pressedNotes[e.meta] = [];
					};
					switch (e.data[0]) {
						case 0: {
							// MSB bank select
							pressedNotes[e.meta].msb = e.data[1];
							break;
						};
						case 1: {
							// Modulation
							pressedNotes[e.meta].mod = e.data[1];
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
							pressedNotes[e.meta].lsb = e.data[1];
							break;
						};
						case 70: {
							// Variation
							pressedNotes[e.meta].var = e.data[1];
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
					};
					break;
				};
				case 12: {
					if (!pressedNotes[e.meta]) {
						pressedNotes[e.meta] = [];
					};
					pressedNotes[e.meta].prg = e.data;
					break;
				};
				case 14: {
					if (!pressedNotes[e.meta]) {
						pressedNotes[e.meta] = [];
					};
					pressedNotes[e.meta].npb = e.data;
					break;
				};
			};
		});
		pressedNotes.forEach(function (e0) {
			polyphony += e0.length;
		});
		if (maxPoly < polyphony) {
			maxPoly = polyphony;
		};
		registerDisp.innerHTML = `Event:${midiEvents.length.toString().padStart(3, "0")} Poly:${Math.max(polyphony, 0).toString().padStart(3, "0")}/256 Bar:${(Math.max(0, curBar) + 1).toString().padStart(3, "0")}/${Math.max(0, curBeat) + 1} TSig:${musicNomin}/${musicDenom}\nMaxPoly:${Math.max(maxPoly, 0).toString().padStart(3, "0")} Time:${Math.floor(audioPlayer.currentTime / 60).toString().padStart(2,"0")}:${Math.floor(audioPlayer.currentTime % 60).toString().padStart(2,"0")}.${Math.round((audioPlayer.currentTime) % 1 * 1000).toString().padStart(3,"0")} Tempo:${Math.floor(musicTempo)}.${Math.round(musicTempo % 1 * 100).toString().padStart(2, "0")}\n\nCH (MSB PRG LSB) BVVEE RCVTD M PI PAN : NOTE\n`;
		pressedNotes.forEach(function (e0, i) {
			registerDisp.innerHTML += `${(i+1).toString().padStart(2, "0")} (${(e0.msb || 0).toString().padStart(3, "0")} ${(e0.prg || 0).toString().padStart(3, "0")} ${(e0.lsb || 0).toString().padStart(3, "0")}) ${map[(e0.bal || 0) >> 3]}${map[(e0.vol || 0) >> 4] + map[(e0.vol || 0) % 16]}${map[(e0.exp || 0) >> 4] + map[(e0.exp || 0) % 16]} ${map[(e0.rev || 0) >> 3]}${map[(e0.cho || 0) >> 3]}${map[(e0.var || 0) >> 3]}${map[(e0.tre || 0) >> 3]}${map[(e0.det || 0) >> 3]} ${((e0.mod || 0) >> 4 > 0 ? "~" : "-")} ${textedPitchBend(e0.npb || [0, 64])} ${textedPanning(e0.pan || 64)}: `;
			Array.from(e0).sort().forEach(function (e1) {
				registerDisp.innerHTML += `${noteNames[e1%12]}${Math.floor(e1/12)} `;
			});
			registerDisp.innerHTML += `\n`;
		});
	};
}, 1000/30);
