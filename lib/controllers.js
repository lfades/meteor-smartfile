SmartFile.prototype.fileControllers = function (options) {
	if (typeof options == 'object')
		_.extend(this.controllers, options);
};

SmartFile.prototype.validateController = function (controller, options) {
	if (!controller.ext)
		throw new Meteor.Error(403, "You must specify the file extension");

	var ext = options.fileName.match(/[^\.^\s^\W]+$/)[0],
		allowedSize = controller.size || 2000000; // 2mb
		
	if (!_.contains(controller.ext, ext))
		throw new Meteor.Error(403, "Invalid file format");

	if (options.size > allowedSize)
		throw new Meteor.Error(403, "The file is too heavy, the maximum is " + ~~(controller.size/1000) + " KB");

	var fileNameId = this.getFileNameId(options.fileName);
	return fileNameId + '.' + (controller.gm ? controller.gmExt || 'jpg': ext);
};

SmartFile.prototype.controllerPath = function (path) {
	return typeof path === 'function' ? path.call(method): path;
};

SmartFile.prototype.Controller = function (method, options, userId) {
	var controller = this.controllers[options.controller];
	if (!controller)
		throw new Meteor.Error(403, "Controller not registered");

	if (!userId)
		throw new Meteor.Error(401, 'no user');

	if (controller.allow && !controller.allow.call(this, options))
		throw new Meteor.Error(403, "Upload not allowed");

	controller.name = options.controller;

	options.fileNameId = this.validateController(controller, options);
	options.share = controller.share == false ? false: true;
	options.path = this.controllerPath(controller.path);

	return controller;	
};