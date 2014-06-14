var Future = Npm.require('fibers/future'),
	FormData = Npm.require('form-data');

var SF_API_ENDPOINT = "app.smartfile.com",
	SF_API_PATH = "/api/2",
	SF_API_URL = "https://" + SF_API_ENDPOINT + SF_API_PATH;

var instancesById = {};

function SmartFileServer (params) {
	params = params || {};
	this.id = params.id || SmartFileBase.defaultId;

	this.config = {};
	this.controllers = {};
	this.config.basePath = "";

	this.configure(params);
	instancesById[this.id] = this;
};

function createFileNameId () {
	var fileNameId = "",
		keyboard = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for(var i=0; i < 16; i++)
		fileNameId += keyboard.charAt(Math.floor(Math.random() * keyboard.length));

	return fileNameId;
};

SmartFile = SmartFileServer;

SmartFileServer.prototype = SmartFileBase.prototype;

_.extend(SmartFileServer.prototype, {
	configure: function (params) {
		params = _.pick(params, "key", "password", "basePath", "fileNameId");
		_.extend(this.config, params);
	},
	_getApiAuthString: function () {
		var key = this.config.key;
		var password = this.config.password;

		if (!_.isString(key) || !_.isString(password) ||
				key.length === 0 || password.length === 0) {
			throw new Error("SmartFile key/password is invalid");
		}

		return key + ":" + password;
	},
	resolve: function (path) {
		return this.config.basePath + "/" + path;
	},
	mkdir: function (path) {
		var url = SF_API_URL + "/path/oper/mkdir/";

		try {
			var result = HTTP.post(url, {
				auth: this._getApiAuthString(),
				data: {path: this.resolve(path)}
			});
			return result.data;
		} catch (e) {
			throw makeSFError(e);
		}
	},
	ls: function (path) {
		var url = SF_API_URL + "/path/info/" + this.resolve(path) + "?children=true";
		try {
			var result = HTTP.get(url, {
				auth: this._getApiAuthString()
			});
			return result.data;
		} catch (e){
			throw makeSFError(e);
		}
	},
	rm: function (paths) {
		var that = this;

		if (!Array.isArray(paths)) {
			paths = [paths];
		}

		var content = paths.map(function(path){
			return "path=" + encodeString(that.resolve(path));
		}).join("&");
		content = encodeContent(content);

		var url = SF_API_URL + "/path/oper/remove/";

		try {
			var result = HTTP.post(url, {
				auth: this._getApiAuthString(),
				content: content,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				}
			});
			return result.data;
		} catch (e){
			throw makeSFError(e);
		}
	},
	cleanSfCollection: function (userId, controller, multiple) {
		var operator = {};
		if(multiple) {
			operator['$pull'] = {};
			operator['$pull'][controller] = multiple;
		} else {
			operator['$unset'] = {};
			if(Array.isArray(controller)) {
				_.each(controller, function (cont) {
					operator['$unset'][cont] = 1;
				});
			} else
				operator['$unset'][controller] = 1;
		}
		
		this.collection.update({'user': userId}, operator);
	},
	save: function (data, options) {
		options.path = options.path || "";
		options.fileName = options.fileName || "upload-" + Date.now();

		var form = new FormData();
		form.append("file", data, {
			filename: options.fileNameId
		});

		var uploadPath = SF_API_PATH + "/path/data/" + this.resolve(options.path);

		var f1 = new Future();
		form.submit({
			protocol: "https:",
			host: SF_API_ENDPOINT,
			path: uploadPath,
			auth: this._getApiAuthString()
		}, f1.resolver());
		f1.wait();

		var res = f1.get();

		var f2 = new Future();
		res.on("data", function(data) {
			f2.return(JSON.parse(data));
		});
		f2.wait();

		var resBody = f2.get();

		if (res.statusCode !== 200) {
			throw makeSFError({statusCode: res.statusCode, data: resBody});
		}

		return resBody;
	},
	// Default Callbacks
	onIncomingFile: function (data, options) {
    	return this.save(data, options);
	},
	allow: function () { return true; },
	onUpload: function () { },
	onUploadFail: function () { },
	fileControllers: function (options) {
		if(typeof options == 'object')
			_.extend(this.controllers, options);
	},
	validateController: function (controller, options, getFileNameId) {
		if(!controller.ext)
			throw new Meteor.Error(403, "You must specify the file extension");

		var ext = options.fileName.match(/[^\.^\s^\W]+$/)[0],
			allowedSize = controller.size || 2000000; // 2mb
			
		if(!_.contains(controller.ext, ext))
			throw new Meteor.Error(403, "Invalid file format");

		if(options.size > allowedSize)
			throw new Meteor.Error(403, "The file is too heavy, the maximum is " + ~~(controller.size/1000) + " KB");

		var fileNameId = getFileNameId ? getFileNameId(options.fileName.match(/([^\/]+)(?=\.\w+$)/g)[0]): createFileNameId();

		return fileNameId + '.' + ext;
	},
	createDoc: function (userFiles, options, multiple) {
		var self = this,
			operator = '$set';

		if(userFiles) {
			var file = userFiles[options.controller];
			if(_.isArray(file))
				operator = '$push';
			else if(file) {
				Meteor.defer(function () {
					self.rm(file.nameId);
				});
			}
		}

		var opts = {'name': options.fileName, 'nameId': options.fileNameId},
			update = {},
			firstFileInMultiple = operator == '$set' && typeof multiple != 'undefined';

		update[operator] = {};
		update[operator][options.controller] = firstFileInMultiple ? [opts]: opts;

		this.collection.upsert({'user': userFiles.user || userFiles}, update);
		return opts;
	}
});

Meteor.methods({
	'sm.upload': function (data, options) {
		var sfInstance = instancesById[options.id];
		if(!sfInstance)
			throw new Meteor.Error(400, "Unknown SmartFile instance id");

		var allowed = sfInstance.allow.call(this, options),
			controller = sfInstance.controllers[options.controller],
			noControllerAllow = controller && controller.allow && !controller.allow.call(this, options);

		if(!allowed || !this.userId || noControllerAllow)
			throw new Meteor.Error(403, "Upload not allowed");

		if(!controller)
			throw new Meteor.Error(403, "Controller not registered");

		if(controller.path)
			options.path = controller.path;

		var userFiles = sfInstance.collection.findOne({'user': this.userId}),
			multiple = controller.multiple;

		if(multiple && userFiles) {
			var files = userFiles[options.controller];
			if(files && typeof multiple == 'number' && files.length === multiple)
				throw new Meteor.Error(403, "You have reached the limit of files");
		}

		options.fileNameId = sfInstance.validateController(controller, options, sfInstance.config.fileNameId);

		try {
			var result = sfInstance.onIncomingFile(new Buffer(data), options);
			sfInstance.onUpload.call(this, result, options);
			
			return sfInstance.createDoc(userFiles || this.userId, options, multiple);
		} catch (e) {
			// Handle only SF related errors
			if (e.statusCode) {
				sfInstance.onUploadFail.call(this, e, options);
				throw new Meteor.Error(500, e.message);
			}
			else {
				throw e;
			}
		}
	},
	'sm.remove': function (id, controller) {
		var sfInstance = instancesById[id];
		if(!sfInstance)
			throw new Meteor.Error(400, "Unknown SmartFile instance id");

		var files = sfInstance.collection.findOne({'user': this.userId})
		if(files) {
			var file = files[controller];
			if(file) {
				Meteor.defer(function() {
					sfInstance.rm(file.nameId);
				});

				sfInstance.cleanSfCollection(this.userId, controller);
			}
		}else {
			throw new Meteor.Error(400, "No smartfile document available");
		}
	}
});

function makeSFError (e) {
	var response = e.response;
	if (!response) {
		return e;
	}

	var error = new Error("SmartFile API returned status code " + response.statusCode);
	error.statusCode = response.statusCode;

	var detail = typeof response.data === "object" ? response.data.detail : null;
	error.detail = detail;
	return error;
};

// extracted from HTTP package
function encodeContent (params) {
	return params.replace(/%20/g, '+');
};

function encodeString (str) {
	return encodeURIComponent(str).replace(/[!'()]/g, escape).replace(/\*/g, "%2A");
};