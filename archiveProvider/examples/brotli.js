"use strict";

// This example requires the use of Browserify and Node.js

// Using BrotliJS

if (self.ArchiveProvider) {
	let brotliRaw = require("brotli");
	let brotliJS = new Specification("brotli");
	brotliJS.decode = function (rawData) {
		return brotliRaw.decompress(rawData);
	};
	brotliJS.encode = function (rawData, options) {
		// Translate options to use a more uniformed API structure.
		let translatedOptions = {mode: options.mode || 0};
		if (options.level) {
			translatedOptions.quality = options.level;
		};
		if (options.window) {
			translatedOptions.lgwin = options.window;
		};
		if (rawData.constructor == String) {
			translatedOptions.mode = 1;
		};
		return brotliRaw.compress(rawData, translatedOptions);
	};
	ArchiveProvider.decompress.register(brotliJS);
};
