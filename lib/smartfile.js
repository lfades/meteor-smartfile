var Future = Npm.require('fibers/future'),
FormData = Npm.require('form-data');

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

SmartFile.prototype.save = function (data, options) {
	var path = options.path || "",
		fileName = options.fileName,
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

	if (options.share) {
		var sharePath = path ? path + '/' + fileNameId: fileNameId,
			share = this.createShareLink(sharePath, fileName || fileNameId);
		
		options.shareId = share.uid;
	}

	var f2 = new Future();
	res.on("data", function(data) {
		f2.return(JSON.parse(data));
	});
	f2.wait();

	var resBody = f2.get();

	if (res.statusCode !== 200)
		throw makeSFError({statusCode: res.statusCode, data: resBody});
	
	return resBody;
};

SmartFile.prototype.rm = function (paths, filesPath) {
	var self = this;

	if (!Array.isArray(paths))
		paths = [paths];

	var content = paths.map(function (path) {
		if (path.nameId) {
			if (path.shareId)
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
	} catch (e) {
		throw makeSFError(e);
	}
};

SmartFile.prototype.mkdir = function (path, share) {
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
};

SmartFile.prototype.ls = function (path) {
	var url = SF_API_URL + "/path/info/" + this.resolve(path) + "?children=true";
	try {
		var result = HTTP.get(url, {
			auth: this._getApiAuthString()
		});
		return result.data;
	} catch (e) {
		throw makeSFError(e);
	}
};

SmartFile.prototype.move = function (paths, dest) {
	var self = this;

	if (!Array.isArray(paths))
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
};

SmartFile.prototype.createShareLink = function (path, name) {
	var url = SF_API_URL + "/link/",
		content = 'path=/' + this.resolve(path) + '&list=true&read=true';

	if(name && name.indexOf('&') === -1)
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
};

SmartFile.prototype.deleteShareLink = function (shareId) {
	var url = SF_API_URL + '/link/' + shareId + '/';
	try {
		var result = HTTP.del(url, {
			auth: this._getApiAuthString()
		});
		return result.data;
	} catch (e) {
		throw makeSFError(e);
	}
};