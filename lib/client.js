SmartFile.prototype.configure = function (params) {
	this.config.publicRootUrl = params.publicRootUrl;
};

SmartFile.prototype.preview = function (file, callback) {
	var fileReader = new FileReader(),
		image = new Image();

	fileReader.onload = function (_file) {
		image.src = _file.target.result;

		image.onload = function () {
			//size: ~~(file.size/1000) +'KB'
			callback(_.extend(
				_.pick(file, 'name', 'type', 'size'),
				_.pick(this, 'src', 'width', 'height')
			));
		};

		image.onerror = function () {
			throw new Error('Invalid file type: ' + file.type);
		};
	};

	fileReader.readAsDataURL(file);
};

SmartFile.prototype.upload = function (file, controller, callback) {
	if (!(file instanceof window.File) && !(file instanceof window.Blob))
		throw new Error('You must pass a File object as first arg');

	if (!Meteor.userId())
		throw new Error('No user login');

	if (!controller || typeof controller != 'string')
		throw new Error('You must pass a controller');

	var params = {
		controller: controller,
		fileName: file.name || 'unnamed.jpg',
		size: file.size,
		id: this.id
	};

	var fileReader = new FileReader(); 

	fileReader.onload = function (_file) {
		Meteor.call('sm.upload', new Uint8Array(_file.target.result), params, callback);
	};

	fileReader.readAsArrayBuffer(file);
};

SmartFile.prototype.remove = function (controller, nameId, callback) {
	var userId = Meteor.userId();

	if (typeof nameId == 'function') {
		callback = nameId;
		nameId = null;
	}

	if (!controller)
		throw new Error("You must pass a controller");

	if (userId && SmartFileCollection.findOne({user: userId}))
		Meteor.call('sm.remove', this.id, controller, nameId, callback);
	else
		throw new Error("No smartfile document available");
};

// dataURItoBlob from: http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
SmartFile.prototype.dataURItoBlob = function (dataURI) {
	var binary = atob(dataURI.split(',')[1]);
	var array = [];
	for (var i = 0; i < binary.length; i++) {
		array.push(binary.charCodeAt(i));
	}
	return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
};

SmartFile.prototype.link = function (file, shareId) {
	if (file) {
		var nameId = file.nameId || file;
		shareId = typeof shareId === 'string' ? shareId: file.shareId;

		return shareId && 'https://file.ac/' + shareId + '/' + nameId;
	}
};