function getShareId (shareId) {
	var instance = UI._templateInstance;

	if(instance && !_.isString(shareId)) {
		try {
			var data = instance().data;
			if(data && data.shareId)
				shareId = data.shareId;
		} catch (e) {
			return null;
		}
	}

	return _.isString(shareId) ? shareId: null;
};

function sfHelpers (sf) {
	UI.registerHelper('sfData', function (controller, shareId) {
		var files = sf.getFiles(controller);

		if(_.isArray(files)) {
			_.each(files, function (file) {
				file.src = sf.link(file, shareId);
			});
		} else if(files)
			files.src = sf.link(files, shareId);
		
		return files;
	});

	UI.registerHelper('sfPath', function (file, shareId) {
		if(file)
			return sf.link(file, shareId);
	});
};

function SmartFileClient (params) {
	if(!params)
		params = {};

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
		if(!this.config.publicRootUrl) {
			console.log('No publicRootUrl configured, configure it or send a shareId with the file [', path, ']');
			return '';
		}

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
	remove: function (controller, nameId, callback) {
		var userId = Meteor.userId();

		if(typeof nameId == 'function') {
			callback = nameId;
			nameId = null;
		}

		if(!controller)
			throw new Error("You must pass a controller");

		if(userId && this.collection.findOne({'user': userId}))
			Meteor.call('sm.remove', this.id, controller, nameId, callback);
		else
			throw new Error("No smartfile document available");
	},
	link: function (file, shareId) {
		if(file) {
			var nameId = file.nameId || file;
			shareId = file.shareId || getShareId(shareId);

			if(shareId)
				return 'https://file.ac/' + shareId + '/' + nameId;
			else
				return this.resolvePublic(nameId);
		}
	}
});