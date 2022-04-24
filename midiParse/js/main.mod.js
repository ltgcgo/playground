"use strict";

import {fileOpen} from "../libs/browser-fs-access@GoogleChromeLabs/browser_fs_access.min.js";

const midiBlobs = JSON.parse('{"extensions":[".mid",".MID"],"startIn":"music","id":"midiOpener","description":"Open a MIDI file"}');

let msgPort = new BroadcastChannel(self.msgId);

$e("#openMidi").addEventListener("click", async function () {
	msgPort.postMessage(await fileOpen(midiBlobs));
});
