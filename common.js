SmartFileBase = function () {};

SmartFileBase.defaultId = "__default";

SmartFileBase.prototype.collection = new Meteor.Collection('smartFile');

SmartFileBase.prototype.getFiles = function (controller, userId) {
	var userId = userId || Meteor.userId();
	if(userId) {
		var files = this.collection.findOne({'user': userId});
		if(files && controller)
			return files[controller];
		else
			return files;
	}
};