meteor-smartfile
================

Package to easily integrate [SmartFile](https://www.smartfile.com/developer/) with meteor, this is an improvement of
https://github.com/sylvaingi/meteor-smartfile 

(thanks [sylvaingi](https://github.com/sylvaingi))
## Installation

```sh
$ mrt add smartfile-api
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
  nameId: 'sjkl7454sfwd5UW.pdf'
}
```

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
	/* 
		photo is a controller for single files, each time a new 
		file is up with the same controller cleared the previous
	*/
	photo: {
		ext: ['jpg', 'png'],
		path: '', // optional, path of storage of the upload relative to basePath
		size: 300000, // 300 Kb - default is 2 Mb
		allow: function (userId) { // optional, validate uploads to this controller
			return true;
		}
	},
	/*
		likes is a controller for multiple files, you can store as many files 
		as possible in the same driver and can be limited
	*/
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

### Client
```js
sf = new SmartFile({
	publicRootUrl: "https://file.ac/XXXXXXXXXX/"
});

// to access files when they uploaded
Meteor.subscribe('smartfile');
```

**publicRootUrl** it must be a `https://file.ac/XXXXXXX/` URL of a SmartFile link 
pointing to your *basePath*.
Links are useful for public access (i.e. the browser fetching uploaded files on SmartFile), 
they can be created through the [UI](https://app.smartfile.com) or via the REST API.

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
				if(error) {
					console.log("error uploading the file", error);
					return;
				}
				console.log("File uploaded, the path is:" + sf.resolvePublic(res.nameId));
			});
		}
	}
});
```

#### Helpers
`fileId` is the `nameId` file, or rather, the name that is stored in SmartFile.
```html
  <img src="{{ stPath 'fileId' }}" />
  
  {{#with sfData 'fileId' }}
    <div>
	  	<img src="{{ src }}"/>
	  	name: {{ name }}
	  	nameId: {{ nameId }}
	  </div>
  {{/with}}
```

```js
sf.getFiles('controller'); // returns the file with that controller or undefined
sf.getFiles(); // this is practically sf.collection.findOne({user: Meteor.userId()});
sf.resolvePublic('fileId'); // https://file.ac/XXXXXXXX/fileId.jpg
sf.remove('controller'); // removes the file from the collection and SmartFile
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

```js
// Works in server
sf.getFiles();

// delete files from the smartFile collection but not from smartfile
sf.cleanSfCollection('controller');

// Creates the uploads/images directory if it does not exist, throws an error otherwise
sf.mkdir("uploads/images");

// Lists the files within the uploads directory
sf.ls("uploads");

// Remove a remote file...
sf.rm("uploads/secret.txt");
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


