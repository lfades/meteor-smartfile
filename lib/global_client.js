SmartFile = function (id) {
	var sf = this;

	Template.registerHelper('sfData', function (controller, shareId) {
		var files = sf.getFiles(controller);

		if (_.isArray(files)) {
			_.each(files, function (file) {
				file.src = sf.link(file, shareId);
			});
		} else if (files)
			files.src = sf.link(files, shareId);
		
		return files;
	});

	Template.registerHelper('sfPath', function (file, shareId) {
		return file && sf.link(file, shareId);
	});

	this.id = id || 'smartfiledefault';
};