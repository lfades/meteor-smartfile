meteor-smartfile
================

Package to easily integrate [SmartFile](https://www.smartfile.com/developer/) with meteor, this is an improvement of
https://github.com/sylvaingi/meteor-smartfile 

(thanks [sylvaingi](https://github.com/sylvaingi))
## Installation

```sh
$ meteor add cottz:smartfile
```

## Example

https://github.com/Goluis/meteor-smartfile-example

## Quick Start
You must first create an account on smartfile ([here](https://app.smartfile.com/dev/signup/))

## Configuration
smartfile create a collection 'smartfile', its structure is:
```js
{
  user: 'userId'
  name: 'cat.pdf',
  nameId: 'sjkl7454sfwd5UW.pdf',
  shareId: 'GPPeDxSsKtk' // only if required
}
```
for multiple files is the same but in an array

### Server
Configuration is achieved through the configure method:

```js
sf = new SmartFile();

sf.configure({
    key: "SmartFile API key",
    password: "SmartFile API password",
    basePath: "uploads",
    fileNameId: function (fileName) {
      return fileName;
    }
});
```
**basePath** is optional and defines the root directory on SmartFile the package will
use for read and write operations. If not specified, the root directory on SmartFile will be used.

**fileNameId** is optional, by default files are uploaded to smartfile with a random id, you can set the nameId that you want with this function


#### Controllers
to upload a file to the client you must pass the controller
```js
sf.fileControllers({
	// photo is a controller for single files, each time a new 
	// file is up with the same controller cleared the previous
	photo: {
		ext: ['jpg', 'png'],
		// path: 'users', is ok
		path: function () {
			// in this case you can use this
			return 'users/' + this.userId;
		},
		size: 300000, // 300 Kb - default is 2 Mb
		allow: function (userId) { // optional, validate uploads to this controller
			// you can use this
			return true;
		}
	},
	// likes is a controller for multiple files, you can store as many files 
	// as possible in the same driver and can be limited
	likes: {
		ext: ['jpg', 'png'],
		multiple: 3 // limit of 3 files
		// multiple: true - no file limit
	}
});

// smartfile publication does not come in the package, you must create it
Meteor.publish('smartfile', function() {
	if(this.userId)
		return sf.collection.find({'user': this.userId});
	return [];
});
```
what you can do with `this` is [here](http://docs.meteor.com/#method_userId).
To each controller can be passed the following options:
* `array` **ext**: All file extensions allowed
* `string` `function` **path**: Path of storage of the upload relative to basePath
* `number` **size**: Maximum file size allowed
* `function` **allow**: some validation before proceeding, it should return true
* `number` `boolean` **multiple**: allows the controller to save more than one file, if a number is given establishes a limit
* `boolean` **share**: creates a file shareId, default is true, for more information visit [Smartfile Links](https://app.smartfile.com/api/2/link/)

### Client
```js
sf = new SmartFile({
	publicRootUrl: "https://file.ac/XXXXXXXXXX"
});

sf = new SmartFile(); // also good

// to access files when they uploaded
Meteor.subscribe('smartfile');
```

**publicRootUrl** it must be a `https://file.ac/XXXXXXX` URL of a SmartFile link 
pointing to your *basePath*.
Links are useful for public access (i.e. the browser fetching uploaded files on SmartFile), 
they can be created through the [UI](https://app.smartfile.com) or via the REST API, for safety reasons I do not recommend using publicRootUrl.

## API

### Client
to upload a file must be a logged in user
```js
Template.smartfile.events({
	'change input[type=file]': function (e) {
		var file = e.target.files[0];
		if(file) {
      // sf.preview only works with images
			sf.preview(file, function(data) {
				if(data)
					$('#preview-images').append('<img src="' + data.src + '"> ' + data.width +'x' + data.height + ' ' + data.size + ' ' + data.type + ' ' + data.name + '<br>');
			});

			sf.upload(file, 'photo', function (error, res) {
				// res has: { nameId: 'XXXXXX.jpg', name: 'some.jpg', shareId: 'XXXXXXX' }
				// shareId only if the controller allows
				if(error) {
					console.log("error uploading the file", error);
					return;
				}
				console.log("File uploaded, the path is:" + sf.link(res));
			});
		}
	},
	'click #removeFile': function () {
		sf.remove('controller', function (error) {
			console.log(error.reason || 'file removed');
		});
	},
	'click #removeFileMultiple': function () {
		// the multiple can save many files, if you send the _id can give specific one to clear, otherwise deletes all files on the controller
		sf.remove('controller', 'some id', function (error) {
			console.log(error.reason || 'file removed');
		});
	}
});
```

#### Helpers
The param `shareId` is optional, default files have shareId but that option can be removed, in which case you must specify the ShareID if you have one or will use the publicRootUrl
```html
  sfPath may receive a parameter with an object that contains the information of the file or only the nameId
  <img src="{{ sfPath file shareId }}" />
  
  {{#with sfData 'controller' shareId }}
    <div>
	  	<img src="{{ src }}"/>
	  	name: {{ name }}
	  	nameId: {{ nameId }}
    </div>
  {{/with}}
  
  sfData in multiple controller is an array I recommend you use in that case #each
  {{#each sfData 'controller' shareId }}
	<div>
	  	<img src="{{ src }}"/>
	  	name: {{ name }}
	  	nameId: {{ nameId }}
	</div>
  {{each}}
```
Note: if a helper has a parent property with a shareId it gets automatically without send it,  for that to work you need [Meteor 0.8.2](https://github.com/meteor/meteor/blob/devel/History.md#v082)

```js
var file = { nameId: nameId, shareId: shareId } || nameId;

// only controller is required
sf.getFiles(controller, nameId, userId);

// only file is required
sf.link(file, shareId);

// only controller is required
sf.remove(controller, nameId, callback);


/******************** Examples ********************/

// returns the file or files with that controller or undefined
sf.getFiles('controller');

// only works on multiple controllers, returns the data of only one file
sf.getFiles('controller', 'someId');

// this is practically sf.collection.findOne({user: Meteor.userId()});
sf.getFiles();

// https://file.ac/publicRootUrl/someId.png
sf.link('someId');

// https://file.ac/shareId/someId.png
sf.link('someId', 'shareId');
sf.link({nameId: 'someId', shareId: 'shareId'});

// removes the file or files from the collection and SmartFile
sf.remove('controller');

// only works on multiple controllers, remove a file from a controller
sf.remove('controller', 'someId');
```

### Server

#### Callbacks

```js
// Used to validate uploads, options is the 2nd argument of the 'upload()' client call
// If it returns false, the upload will be halted and a Meteor.Error with status 403 will be thrown
sf.allow = function (options) {
    return options.path === "uploads";
};

// Callbacks for upload success or failure
// result contains statusCode returned by SmartFile API and path corresponding to the upload
sf.onUpload = function (result, options) {
    console.log("File uploaded to " + result.path);
};

sf.onUploadFail = function (error, options) {
    console.log("SmartFile returned error", error.statusCode, error.detail);
};
```

#### Utilities
all paths are relative to `basePath`
```js
// Works in server
sf.getFiles();

// cleanSfCollection delete files from the smartFile collection but not from smartfile
// You can pass the id of a file in the third parameter if the controller is a
// multiple controller and remove from the controller only that file
sf.cleanSfCollection(userId, controller, nameId);

// Creates the uploads/images directory if it does not exist, throws an error otherwise
// share is true or false, default is false, creates a shareId for the created folder
// share data is within result.share, the share path or shareId is result.share.uid
sf.mkdir("uploads/images", share);

// Lists the files within the uploads directory
sf.ls("uploads");

// remove a remote file, you can send an array of files
// otherBasePath is generally used to send the path of a controller
sf.rm(path, otherBasePath)
// examples:
sf.rm("secret.txt") // /basePath/secret.txt
sf.rm("uploads/secret.txt"); // /basePath/uploads/secret.txt
sf.rm("uploads/secret.txt", 'myUser'); // /basePath/myUser/uploads/secret.txt
sf.rm({nameId: "secret.txt", shareId: "XXXXX"}, 'myUser'); // also eliminates the share

// move a file to another path, you can send an array of files
sf.move("uploads/secret.txt", "anotherPath/here");

// create a share for a file, the share name is optional
sf.createShareLink("uploads/secret.txt", 'share name');

// remove a share
sf.deleteShareLink('shareId');
```

#### Advanced

Internally, meteor-smartfile defines a Meteor method invoking `sf.onIncomingFile(data, options)` 
whenever a client calls `upload()` and the server `allow()` callback returns true.  

The default implementation performs the following operation:
```js
sf.onIncomingFile = function (data, options) {
    // upload the Buffer data to SmartFile
    sf.save(data, options);
}
```

It can be overriden in order to tweak the upload contents, as the data parameter is a Node.js Buffer instance. 
A real-world usage would be resizing a received image in 3 sizes and upload them 
to SmartFile via 3 calls to `sf.save()`.

## Contributing

I really like meteor and I hope help, I am not native in English but I want to share with the community.

## what next?
* **modify image before uploading**: I do not know how to do that actually, but I'll find out, if you tell me how I appreciate

* **other features**: I use this package in my application if I need something I'll update, I will not let the package back, if you know anything you may have, let me know

## License

MIT
