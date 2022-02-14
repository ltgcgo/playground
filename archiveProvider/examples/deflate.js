"use strict";

{
	let deflate = new Specification("deflate");
	ArchiveProvider.register(deflate);
	deflate.decompress = function (rawData, options = {}) {
		return pako.inflate(rawData, options);
	};
	deflate.compress = function (rawData, options = {}) {
		let translatedOptions = {
			level: options.level || 4,
			windowBits: Math.log2(options.window || 512),
			memLevel: options.memory || 8
		};
		if (options.strategy) {
			translatedOptions.strategy = options.strategy;
		};
		return pako.deflate(rawData, translatedOptions);
	};
	let gzip = new Specification("gzip");
	ArchiveProvider.register(gzip);
	gzip.decompress = function (rawData, options = {}) {
		return pako.inflate(rawData, options);
	};
	gzip.compress = function (rawData, options = {}) {
		let translatedOptions = {
			level: options.level || 4,
			windowBits: Math.log2(options.window || 512),
			memLevel: options.memory || 8
		};
		if (options.strategy) {
			translatedOptions.strategy = options.strategy;
		};
		return pako.gzip(rawData, translatedOptions);
	};
};
