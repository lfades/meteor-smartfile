Meteor.methods({
	'sm.upload': function (data, options) {
		check(options, {
			controller: String,
			fileName: String,
			size: Number,
			id: String
		});

		var smartFile = SmartFileInstances[options.id];
		if (!smartFile)
			throw new Meteor.Error(400, 'Unknown smartFile instance id');

		if (!(data instanceof Uint8Array))
			throw new Meteor.Error(403, 'invalid file');
		
		var userId = this.userId;

		if (!smartFile.allow.call(this, options))
			throw new Meteor.Error(403, 'Upload not allowed');

		var controller = smartFile.Controller(this, options, userId),
		userFiles = smartFile.userFiles(controller, userId),
		files = smartFile.beforeUpload(new Buffer(data), controller, options);

		try {
			var filesLength = files.length,
			optsGm = options.gm,
			ext = '.' + (controller.gmExt || 'jpg');

			for (var i = 0; i < filesLength; i ++) {
				var opts;
				if (i > 0) {
					if (!optsGm) {
						options.gm = [];
						optsGm = options.gm;
					}

					opts = {
						fileNameId: smartFile.getFileNameId() + ext,
						path: options.path,
						share: options.share
					};
				} else
					opts = options;

				var result = smartFile.onIncomingFile(files[i], opts);
				smartFile.onUpload.call(this, result, opts);

				if (optsGm) {
					var gmFile = {nameId: opts.fileNameId};
					if (opts.shareId)
						gmFile.shareId = opts.shareId;
					
					optsGm.push(gmFile);
				}
			}

			return smartFile.updateDoc(userFiles, options, controller.multiple);
		} catch (e) {
			// Handle only SF related errors
			if (e.statusCode) {
				smartFile.onUploadFail.call(this, e, options);
				throw new Meteor.Error(500, e.message);
			} else
				throw e;
		}
	},
	'sm.remove': function (id, controller, nameId) {
		var smartFile = SmartFileInstances[id];
		if (!smartFile)
			throw new Meteor.Error(400, 'Unknown smartFile instance id');

		var userId = this.userId;
		if (!userId)
			throw new Meteor.Error(401, 'no user');

		var sfController = smartFile.controllers[controller];
		if (!sfController)
			throw new Meteor.Error(402, 'Controller not registered');

		var files = smartFile.getAllFiles(controller, nameId);
		if (!files)
			throw new Meteor.Error(400, 'No files to delete');

		var filesPath = smartFile.controllerPath(sfController.path);
		
		smartFile.cleanSfCollection(userId, controller, nameId && {nameId: nameId});
		Meteor.defer(function () {
			smartFile.rm(files, filesPath);
		});
	}
});