SmartFileCollection = new Mongo.Collection('smartFile');

SmartFile.prototype.getFiles = function (controller, nameId, userId) {
	var userId = userId || Meteor.userId();
	if (!userId)
		return;
	
	var userFiles = SmartFileCollection.findOne({user: userId});
	if (userFiles && controller) {
		var files = userFiles[controller];
		if (nameId && _.isArray(files))
			return _.findWhere(files, {nameId: nameId});
		else
			return files;
	} else
		return userFiles;
};

SmartFile.prototype.getAllFiles = function (controller, nameId, userId) {
	var files = typeof controller === 'string'
		? this.getFiles(controller, nameId, userId)
		: controller;

	if (!files) return;

	if (!Array.isArray(files))
		files = [files];

	_.each(files, function (file) {
		var gmFiles = file.gm;
		if (gmFiles) {
			delete file.gm;

			if (Array.isArray(gmFiles)) {
				_.each(gmFiles, function (gmFile) {
					files.push(gmFile);
				});
			} else
				files.push(gmFiles);
		}
	});

	return files;
};

SmartFile.prototype.cleanSfCollection = function (userId, controller, multiple) {
	var operator = {};
	if (multiple) {
		operator.$pull = {};
		operator.$pull[controller] = multiple;
	} else {
		operator.$unset = {};
		if (Array.isArray(controller)) {
			_.each(controller, function (cont) {
				operator.$unset[cont] = 1;
			});
		} else
			operator.$unset[controller] = 1;
	}
	
	SmartFileCollection.update({user: userId}, operator);
};