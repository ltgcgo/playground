"use strict";

MidiParser.customInterpreter = function (type, file) {
	// THIS MAY OR MAY NOT WORK PROPERLY!
	let metaLength = file.readIntVLV();
	if (type == 127) {
		metaLength = 1;
	};
	let u8Data = new Uint8Array(metaLength);
	for (let c = 0; c < metaLength; c ++) {
		u8Data[c] = file.readInt(1);
	};
	return u8Data;
};

self.MidiEventPool = class {
	list = new TimedEventsCollection();
	constructor (json) {
		if (json) {
			this.import(json);
		};
		this.list.name = "MIDI Event Pool"
	};
	import (json) {
		const possibleFps = [24, 25, 29.97, 30];
		let upThis = this;
		// MIDI time division
		let division = json.timeDivision, tempo = 120, timePointer = 0, lastTimePointer = 0, pointerOffset = 0;
		let noteTracking = {}, tempoChanges = new TimedEvents();
		tempoChanges.push(new RangeEvent(0, 281474976710655, [120, 0]));
		tempoChanges.pointSpan = 1;
		json.track.forEach(function (e0, i0) {
			timePointer = 0, lastTimePointer = 0, pointerOffset = 0;
			let track = new TimedEventsCollection();
			track.name = `MIDI Track ${upThis.list.length}`;
			upThis.list.push(track);
			e0.event.forEach(function (e1, i1) {
				let addEventToTrack = true;
				timePointer += e1.deltaTime;
				// Should the current event apply a new tempo and pointerOffset?
				let changeData = tempoChanges.at(timePointer)[0];
				if (changeData) {
					tempo = changeData.data[0];
					pointerOffset = changeData.data[1];
				};
				// Event parsing
				switch (e1.type) {
					case 8: {
						// Note off
						//addEventToTrack = false;
						break;
					};
					case 9: {
						// Note on
						//addEventToTrack = false;
						break;
					};
					case 10: {
						// Note aftertouch
						//addEventToTrack = false;
						break;
					};
					case 11: {
						// Controller
						break;
					};
					case 12: {
						// Program change
						break;
					};
					case 14: {
						// Pitch bend
						break;
					};
					case 15: {
						// Extended event, used by XG or others
						break;
					};
					case 255: {
						// Metadata
						switch (e1.metaType) {
							case 81: {
								// Switch tempo
								let currTime = timePointer / tempo / division * 60 + pointerOffset;
								tempo = 60000000 / e1.data;
								pointerOffset = currTime - timePointer / tempo / division * 60;
								//debugger;
								if (tempoChanges[tempoChanges.length - 1]) {
									if (tempoChanges[tempoChanges.length - 1].end > timePointer) {
										tempoChanges[tempoChanges.length - 1].end = timePointer;
									};
									if (tempoChanges[tempoChanges.length - 1].end - tempoChanges[tempoChanges.length - 1].start < 0.005) {
										tempoChanges.pop();
									};
								};
								tempoChanges.push(new RangeEvent(timePointer, 281474976710655, [tempo, pointerOffset]));
								console.debug(`Tempo switched to ${tempo} bpm`);
								break;
							};
							case 84: {
								// SMPTE offset change
								let hourByte = e1.data[0];
								let setFps = possibleFps[(hourByte >> 7 << 2) ^ (hourByte >> 5)];
								let setH = (hourByte >> 5 << 5) ^ hourByte;
								let setM = e1.data[1], setS = e1.data[2], setF = e1.data[3], setSf = e1.data[4];
								console.debug(`SMPTE set to ${setFps} FPS, ${setH.toString().padStart(2, "0")}:${setM.toString().padStart(2, "0")}:${setS.toString().padStart(2, "0")}/${setF.toString().padStart(2, "0")}.${setSf.toString().padStart(2, "0")}`);
								break;
							};
							default: {
								//console.debug(`${e1.data}`);
							};
						};
						break;
					};
					default: {
						console.debug(`Unrecognized event type ${e1.type} on track ${i0}, event ${i1}, time pointer ${timePointer}`);
					};
				};
				let changedTempo = tempoChanges.point(timePointer)[0];
				if (changedTempo) {
					tempo = changedTempo.data[0];
					pointerOffset = changedTempo.data[1];
					//console.info(Math.floor(changedTempo.data[0]));
				};
				if (addEventToTrack) {
					let targetChannel = 0;
					if (e1.type != 255) {
						targetChannel = e1.channel;
					};
					if (!track[targetChannel]) {
						track[targetChannel] = new TimedEvents();
						track[targetChannel].name = `MIDI Channel ${targetChannel}`;
					};
					let appendObj = {type: e1.type, data: e1.data};
					if (e1.type == 255) {
						appendObj.meta = e1.metaType;
					} else {
						appendObj.meta = e1.channel;
					};
					track[targetChannel].push(new PointEvent(timePointer / tempo / division * 60 + pointerOffset, appendObj));
				};
			});
			//console.info(`${tempo}bpm, ${timePointer} deltas`);
		});
		console.info(tempoChanges);
	};
	reset () {
		delete this.list;
		this.list = new TimedEventsCollection();
	};
};
