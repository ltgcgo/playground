"use strict";

{
	// Deflate
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
	// GZip
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
	// BZip2
	let bzip2 = new Specification("bzip2");
	bzip2.decompress = function (rawData, options = {}) {
		return bz2.decompress(rawData, options.verify || false);
	};
	ArchiveProvider.register(bzip2);
	// LZMA
	let lzma = new Specification("lzip");
	ArchiveProvider.register(lzma);
	lzma.decompress = function (rawData) {
		return LZMA.decompress(rawData);
	};
	lzma.compress = function (rawData) {
		return LZMA.compress(rawData);
	};
};
