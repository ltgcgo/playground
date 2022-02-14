"use strict";

{
	let bzip2 = new Specification("bzip2");
	bzip2.decompress = function (rawData, options = {}) {
		return bz2.decompress(rawData, options.verify || false);
	};
	ArchiveProvider.register(bzip2);
};
