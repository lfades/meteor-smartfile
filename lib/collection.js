SmartFile.prototype.updateDoc = function (userFiles, options, multiple) {
	var self = this,
	operator = '$set',
	// userFiles can be only an object or just a string with the userId
	userId = userFiles.user;

	if (userId) {
		var file = userFiles[options.controller];
		if (_.isArray(file))
			operator = '$push';
		else if (file) {
			Meteor.defer(function () {
				self.rm(self.getAllFiles(file), options.path);
			});
		}
	}

	var opts = {name: options.fileName, nameId: options.fileNameId},
		update = {},
		firstFileInMultiple = operator === '$set' && typeof multiple !== 'undefined',
		shareId = options.shareId,
		gm = options.gm;

	if (shareId)
		opts.shareId = shareId;

	if (gm) {
		if (gm.length === 1)
			opts.gm = gm[0];
		else
			opts.gm = gm;
	}

	update[operator] = {};
	update[operator][options.controller] = firstFileInMultiple ? [opts]: opts;

	SmartFileCollection.upsert({user: userId || userFiles}, update);
	return opts;
};

SmartFile.prototype.userFiles = function (controller, userId) {
	var userFiles = SmartFileCollection.findOne({user: userId}),
	multiple = controller.multiple;

	if (multiple && userFiles) {
		var files = userFiles[controller.name];
		if (files && typeof multiple == 'number' && files.length === multiple)
			throw new Meteor.Error(403, 'You have reached the limit of files');
	}

	return userFiles || userId;
};

Meteor.publish(null, function () {
	var userId = this.userId;
	if (!userId)
		return this.ready();

	return SmartFileCollection.find({user: userId});
});