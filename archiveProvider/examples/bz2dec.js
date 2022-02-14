"use strict";

{
	let bzip2 = function (rawData, options = {}) {
		return bz2.decompress(rawData, options.verify || false);
	};
	ArchiveProvider.decompress.register(bzip2);
};
