SF_API_ENDPOINT = "app.smartfile.com";
SF_API_PATH = "/api/2";
SF_API_URL = "https://" + SF_API_ENDPOINT + SF_API_PATH;
SmartFileInstances = [];
gm = Npm.require('gm');

SmartFile = function (params) {
	params = params || {};

	this.config = {};
	this.controllers = {};
	this.config.basePath = "";
	this.id = params.id || 'smartfiledefault';

	SmartFileInstances[this.id] = this;

	this.configure(params);
};