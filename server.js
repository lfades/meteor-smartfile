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

function validParam (param) {
	return param.indexOf('&') === -1;
};

function getControllerPath (options, path) {
	return typeof path == 'function' ? path.call(options): path;
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
	resolve: function (path, beforePath) {
		var basePath = this.config.basePath + "/";
		if(beforePath)
			basePath += beforePath + "/";
		return basePath + path;
	},
	mkdir: function (path, share) {
		var url = SF_API_URL + "/path/oper/mkdir/";

		try {
			var result = HTTP.post(url, {
				auth: this._getApiAuthString(),
				data: {path: this.resolve(path)}
			});

			var data = result.data;
			if(share)
				data.share = _.omit(this.createShareLink(path, data.name), 'owner');

			return data;
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
	rm: function (paths, filesPath) {
		var self = this;

		if(!Array.isArray(paths))
			paths = [paths];

		var content = paths.map(function (path) {
			if(path.nameId) {
				if(path.shareId)
					self.deleteShareLink(path.shareId);
				path = path.nameId;
			}
			return "path=" + encodeString(self.resolve(path, filesPath));
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
	move: function (paths, dest) {
		var self = this;

		if(!Array.isArray(paths))
			paths = [paths];

		var content = paths.map(function (path) {
			return "src=" + encodeString(self.resolve(path));
		}).join("&");
		content += '&dst=' + encodeString(self.resolve(dest));
		
		var url = SF_API_URL + "/path/oper/move/";
		try {
			var result = HTTP.post(url, {
				auth: this._getApiAuthString(),
				content: content,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				}
			});

			return result.data;
		} catch (e) {
			throw makeSFError(e);
		}
	},
	createShareLink: function (path, name) {
		var url = SF_API_URL + "/link/",
			content = 'path=/' + this.resolve(path) + '&list=true&read=true';

		if(name && validParam(name))
			content += '&name=' + name;

		try {
			var result = HTTP.post(url, {
				auth: this._getApiAuthString(),
				content: content,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				}
			});
			return result.data;
		} catch (e) {
			throw makeSFError(e);
		}
	},
	deleteShareLink: function (shareId) {
		var url = SF_API_URL + '/link/' + shareId + '/';
		try {
			var result = HTTP.del(url, {
				auth: this._getApiAuthString()
			});
			return result.data;
		} catch (e) {
			throw makeSFError(e);
		}
	},
	save: function (data, options) {
		var path = options.path || "",
			fileName = options.fileName || "upload-" + Date.now(),
			fileNameId = options.fileNameId;

		var form = new FormData();
		form.append("file", data, {
			filename: fileNameId
		});

		var uploadPath = SF_API_PATH + "/path/data/" + this.resolve(path);

		var f1 = new Future();
		form.submit({
			protocol: "https:",
			host: SF_API_ENDPOINT,
			path: uploadPath,
			auth: this._getApiAuthString()
		}, f1.resolver());
		f1.wait();

		var res = f1.get();

		if(options.share) {
			var sharePath = path ? path + '/' + fileNameId: fileNameId,
				share = this.createShareLink(sharePath, fileName);
			options.shareId = share.uid;
		}

		var f2 = new Future();
		res.on("data", function(data) {
			f2.return(JSON.parse(data));
		});
		f2.wait();

		var resBody = f2.get();

		if(res.statusCode !== 200)
			throw makeSFError({statusCode: res.statusCode, data: resBody});
		
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
					self.rm(file, options.path);
				});
			}
		}

		var opts = {'name': options.fileName, 'nameId': options.fileNameId},
			update = {},
			firstFileInMultiple = operator == '$set' && typeof multiple != 'undefined',
			shareId = options.shareId;

		if(shareId)
			opts.shareId = shareId;

		update[operator] = {};
		update[operator][options.controller] = firstFileInMultiple ? [opts]: opts;

		// userFiles can be only an object or just a string with the userId
		this.collection.upsert({'user': userFiles.user || userFiles}, update);
		return opts;
	}
});

Meteor.methods({
	'sm.upload': function (data, options) {
		var sfInstance = instancesById[options.id];
		if(!sfInstance)
			throw new Meteor.Error(400, "Unknown SmartFile instance id");

		var userId = this.userId,
			allowed = sfInstance.allow.call(this, options),
			controller = sfInstance.controllers[options.controller],
			noControllerAllow = controller && controller.allow && !controller.allow.call(this, options);

		if(!allowed || !userId || noControllerAllow)
			throw new Meteor.Error(403, "Upload not allowed");

		if(!controller)
			throw new Meteor.Error(403, "Controller not registered");

		var userFiles = sfInstance.collection.findOne({'user': userId}),
			multiple = controller.multiple;

		if(multiple && userFiles) {
			var files = userFiles[options.controller];
			if(files && typeof multiple == 'number' && files.length === multiple)
				throw new Meteor.Error(403, "You have reached the limit of files");
		}

		_.extend(options, {
			fileNameId: sfInstance.validateController(controller, options, sfInstance.config.fileNameId),
			share: controller.share == false ? false: true,
			path: getControllerPath(this, controller.path)
		});

		try {
			var result = sfInstance.onIncomingFile(new Buffer(data), options);
			sfInstance.onUpload.call(this, result, options);

			return sfInstance.createDoc(userFiles || userId, options, multiple);
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
	'sm.remove': function (id, controller, nameId) {
		var sfInstance = instancesById[id];
		if(!sfInstance)
			throw new Meteor.Error(400, 'Unknown SmartFile instance id');
		
		var userId = this.userId;
		if(!userId)
			throw new Meteor.Error(401, 'no user');

		var files = sfInstance.getFiles(controller, nameId),
			sfController = sfInstance.controllers[controller];

		if(sfController)
			var filesPath = getControllerPath(this, sfController.path);
		else
			throw new Meteor.Error(402, 'that controller is not registered');
		
		if(files) {
			sfInstance.cleanSfCollection(userId, controller, nameId ? {'nameId': nameId}: null);
			Meteor.defer(function () {
				sfInstance.rm(files, filesPath);
			});
		} else
			throw new Meteor.Error(400, 'No files to delete');
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