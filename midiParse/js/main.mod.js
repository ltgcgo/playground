"use strict";

import {fileOpen} from "../libs/browser-fs-access@GoogleChromeLabs/browser_fs_access.min.js";

const midiBlobs = JSON.parse('{"extensions":[".mid",".MID"],"startIn":"music","id":"midiOpener","description":"Open a MIDI file"}'), audioBlobs = JSON.parse('{"mimeTypes":["audio/*"],"startIn":"music","id":"audioOpener","description":"Open an audio file"}');

let msgPort = new BroadcastChannel(self.msgId);

$e("#openMidi").addEventListener("click", async function () {
	let blob = await fileOpen(midiBlobs);
	msgPort.postMessage({type: "midi", blob: blob});
});
$e("#openAudio").addEventListener("click", async function () {
	let blob = await fileOpen(audioBlobs);
	msgPort.postMessage({type: "audio", blob: blob});
});