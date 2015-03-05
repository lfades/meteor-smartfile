SmartFile.prototype.configure = function (params) {
	params = _.pick(params, "key", "password", "basePath", "fileNameId");
	_.extend(this.config, params);
};

SmartFile.prototype._getApiAuthString = function () {
	var key = this.config.key;
	var password = this.config.password;

	if (!_.isString(key) || !_.isString(password) ||
			key.length === 0 || password.length === 0) {
		throw new Error("SmartFile key/password is invalid");
	}

	return key + ":" + password;
};

SmartFile.prototype.resolve = function (path, beforePath) {
	var basePath = this.config.basePath + "/";
	if (beforePath)
		basePath += beforePath + "/";
	return basePath + path;
};