"use strict";

let midiBlob, midiBuffer, midiJson, msgPort;

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

{
	const map = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
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
let polyphony = 0;
let audioDelay = 1.58;
audioPlayer.onplaying = function () {
	//textField.innerHTML = "";
	this.reallyPlaying = true;
	polyphony = 0;
	registerDisp.innerHTML = "Empty register";
	midiEventPool.list.resetPointer(0);
	midiEventPool.list.pointSpan = 0.5;
};
audioPlayer.onpause = function () {
	this.reallyPlaying = false;
};
const noteNames = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
self.pressedNotes = [];
self.task = setInterval(function () {
	if (self.midiEventPool && audioPlayer.reallyPlaying) {
		self.midiEvents = midiEventPool.list.at(audioPlayer.currentTime - audioDelay);
		midiEvents.forEach(function (f) {
			let e = f.data;
			switch (e.type) {
				case 255: {
					switch (e.meta) {
						case 88: {
							// Time signature
							let denom = 1 << e.data[1];
							let metronomClick = 24 * (32 / e.data[3]) / e.data[2];
							textField.innerHTML += `Time sig is ${e.data[0]}/${denom}, metronom clicks ${metronomClick} times per full note.\n`;
							break;
						};
						case 81: {
							// Switch tempo
							let tempo = 60000000 / e.data;
							textField.innerHTML += `Tempo switched to ${tempo} bpm\n`;
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
							textField.innerHTML += `${e.data}\n`;
						};
					};
					break;
				};
				case 8: {
					if (pressedNotes[e.meta] && pressedNotes[e.meta].has(e.data[0])) {
						pressedNotes[e.meta].delete(e.data[0]);
					};
					break;
				};
				case 9: {
					if (e.data[1] > 31) {
						if (pressedNotes[e.meta] && pressedNotes[e.meta].has(e.data[0])) {
							pressedNotes[e.meta].delete(e.data[0]);
						};
					} else {
						if (!pressedNotes[e.meta]) {
							pressedNotes[e.meta] = new Set();
						};
						pressedNotes[e.meta].add(e.data[0])
					};
					break;
				};
			};
		});
		registerDisp.innerHTML = `Events: ${midiEvents.length}, polyphony: ${Math.max(polyphony, 0)}/256, current: ${audioPlayer.currentTime}\n\n`;
		pressedNotes.forEach(function (e0, i) {
			registerDisp.innerHTML += `CH${i+1}: `;
			Array.from(e0).sort().forEach(function (e1) {
				registerDisp.innerHTML += `${noteNames[e1%12]}${Math.floor(e1/12)} `;
			});
			registerDisp.innerHTML += `\n`;
		});
	};
}, 20);
