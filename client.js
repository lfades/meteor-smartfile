function sfHelpers(sf) {
	UI.registerHelper('sfData', function (controller) {
		var file = sf.getFiles(controller);
		if(file)
			file.src = sf.resolvePublic(file.nameId);
		
		return file;
	});

	UI.registerHelper('sfPath', function (nameId, other) {
		if(nameId)
			return sf.resolvePublic(nameId);
		return other;
	});
};

function SmartFileClient (params) {
	this.id = params.id || SmartFileBase.defaultId;
	this.config = {};
	this.configure(params);
	
	sfHelpers(this);
};

SmartFile = SmartFileClient;

SmartFileClient.prototype = SmartFileBase.prototype;

_.extend(SmartFileClient.prototype, {
	configure: function (params) {
		this.config.publicRootUrl = params.publicRootUrl;
	},
	resolvePublic: function (path) {
		if(!this.config.publicRootUrl)
			throw new Error("No publicRootUrl configured");

		return this.config.publicRootUrl + "/" + path;
	},
	preview: function (file, callback) {
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
	},
	upload: function (file, controller, callback) {
		if(!file)
			throw new Error("You must pass a File object as first arg");

		if(!controller || typeof controller != 'string')
			throw new Error("You must pass a controller");

		if(!Meteor.user())
			throw new Error("No user login");

		var params = {
			'controller': controller,
			'fileName': file.name,
			'size': file.size,
			'id': this.id
		};

		var fileReader = new FileReader(); 

		fileReader.onload = function (_file) {
			// new Uint8Array(_file.target.result) = el archivo
			Meteor.call('sm.upload', new Uint8Array(_file.target.result), params, callback);
		};

		fileReader.readAsArrayBuffer(file);
	},
	remove: function (controller, callback) {
		var userId = Meteor.userId();

		if(!controller)
			throw new Error("You must pass a controller");

		if(userId && this.collection.findOne({'user': userId}))
			Meteor.call('sm.remove', this.id, controller, callback);
		else
			throw new Error("No smartfile document available");
	}
});