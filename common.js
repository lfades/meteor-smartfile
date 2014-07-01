SmartFileBase = function () {};

SmartFileBase.defaultId = "__default";

SmartFileBase.prototype.collection = new Meteor.Collection('smartFile');

SmartFileBase.prototype.getFiles = function (controller, nameId, userId) {
	var userId = userId || Meteor.userId();
	if(userId) {
		var userFiles = this.collection.findOne({'user': userId});
		if(userFiles && controller) {
			var files = userFiles[controller];
			if(nameId && _.isArray(files))
				return _.findWhere(files, {'nameId': nameId});
			else
				return files;
		} else
			return userFiles;
	}
};