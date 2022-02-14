"use strict";
if (!self.CanvasVisualizer) {
	self.CanvasVisualizer = function () {};
};

var thread, lineBeatOpt, changeDir, trcContent, lyricObj, lastId, trigDelay = 0;
var audio;

lineBeatOpt = {
	speed: 6,
	direction: 1
};

$invoke(0, async function () {
	audio = $("audio");
	fetch("./audio.ogg").then(function (f) {return f.blob()}).then(function (blob) {
		audio.src = blob.getURL();
	});
	fetch("./audio.trc").then(function (f) {return f.blob()}).then(function (blob) {
		blob.get("text").then(function (f) {
			trcContent = getEvents(f);
		});
	});
});

$invoke(0, function () {
	let color = 60;
	let canvas = $("canvas"), eventId = $("div");
	let ctx = canvas.getContext("2d", {alpha: !self.mozInnerScreenY, desynchronized: true});
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.fillStyle = "hsl(60 100% 50%)"
	let drawIt = function (ctx, info) {
		if (!info.media.paused) {
			let halfW = ctx.canvas.width * 0.8, halfH = ctx.canvas.height * 0.2;
			// Move canvas
			let oldImgDt = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
			let tHori = 0, tVert = 0;
			color = (color + 1) % 360;
			ctx.fillStyle = `hsl(${color}, 100%, 50%)`;
			if (lineBeatOpt.direction >> 1) {
				if (lineBeatOpt.direction % 2) {
					tVert = 1;
				} else {
					tVert = -1;
				};
			} else {
				if (lineBeatOpt.direction % 2) {
					tHori = -1;
				} else {
					tHori = 1;
				};
			};
			ctx.putImageData(oldImgDt, lineBeatOpt.speed * tHori, lineBeatOpt.speed * tVert);
			// Start drawing
			ctx.fillRect(halfW - 16, halfH - 16, 32, 32);
		};
	};
	thread = setInterval(function () {
		if (self.trcContent) {
			lyricObj = trcContent.getCurrent(audio.currentTime + trigDelay);
			if (lyricObj) {
				eventId.innerText = `${Math.round(lyricObj.start * 1000) / 1000}`;
				if (lyricObj.id != lastId) {
					changeDir();
				};
				lastId = lyricObj.id;
			} else {
				eventId.innerText = "Idle";
			};
		};
		drawIt(ctx, {media: audio});
	}, 20);
	changeDir = function () {
		let tk = lineBeatOpt.direction;
		lineBeatOpt.direction = (((tk >> 1) + 1) % 2 << 1) + (tk % 2);
	};
	canvas.addEventListener("mousedown", changeDir);
});
