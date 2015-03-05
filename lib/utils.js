function createFileNameId () {
	var fileNameId = "",
		keyboard = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for(var i=0; i < 16; i++)
		fileNameId += keyboard.charAt(Math.floor(Math.random() * keyboard.length));

	return fileNameId;
};

SmartFile.prototype.getFileNameId = function (fileName) {
	var getFileNameId = this.config.fileNameId;

	if (getFileNameId)
		return getFileNameId(fileName && fileName.match(/([^\/]+)(?=\.\w+$)/g)[0]);
	else
		return createFileNameId();
};

SmartFile.prototype.beforeUpload = function (buffer, controller) {
	var withGm = controller.gm,
	gmImages = controller.gmImages,
	gmExt = controller.gmExt || 'jpg',
	files = [],
	self = this;

	function onImage (callback) {
		var image = gm(buffer);
		if (typeof callback === 'function')
			callback(image);

		var toBuffer = Async.wrap(image, 'toBuffer');
		files.push(toBuffer(gmExt));
	};

	if (withGm)
		onImage(withGm);
	else
		files.push(buffer);

	if (gmImages) {
		if (Array.isArray(gmImages)) {
			_.each(gmImages, function (file) {
				onImage(file);
			});
		} else
			onImage(gmImages);
	}

	return files;
};

SmartFile.prototype.onIncomingFile = function (data, options) {
	return this.save(data, options);
};

SmartFile.prototype.allow = function () { return true; };
SmartFile.prototype.onUpload = function () { };
SmartFile.prototype.onUploadFail = function () { };