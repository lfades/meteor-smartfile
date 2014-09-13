SmartFileBase = function () {};

SmartFileBase.defaultId = "__default";

_.extend(SmartFileBase.prototype, {
	collection: new Mongo.Collection('smartFile'),

	getFiles: function (controller, nameId, userId) {
		var userId = userId || Meteor.userId();
		if(userId) {
			var userFiles = this.collection.findOne({user: userId});
			if(userFiles && controller) {
				var files = userFiles[controller];
				if(nameId && _.isArray(files))
					return _.findWhere(files, {nameId: nameId});
				else
					return files;
			} else
				return userFiles;
		}
	},
	// defined on both the server and client for latency compensation
	cleanSfCollection: function (userId, controller, multiple) {
		var operator = {};
		if(multiple) {
			operator.$pull = {};
			operator.$pull[controller] = multiple;
		} else {
			operator.$unset = {};
			if(Array.isArray(controller)) {
				_.each(controller, function (cont) {
					operator.$unset[cont] = 1;
				});
			} else
				operator.$unset[controller] = 1;
		}
		
		this.collection.update({user: userId}, operator);
	}
});