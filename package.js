Package.describe({
  name: 'cottz:smartfile',
  version: '0.3.1',
  summary: 'Smartfile integration for meteor',
  git: 'https://github.com/Goluis/meteor-smartfile',
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('1.0.3.2');

  api.use('mongo');
  api.use('http', 'server');
  
  api.use('meteorhacks:async@1.0.0');

  Npm.depends({
    'form-data': '0.1.2',
    'gm': '1.17.0'
  });

  api.addFiles('lib/global_client.js', 'client');
  api.addFiles('lib/global_server.js', 'server');
  api.addFiles('lib/client.js', 'client');
  api.addFiles('lib/helpers.js');
  api.addFiles([
    'lib/config.js',
    'lib/utils.js',
    'lib/controllers.js',
    'lib/smartfile.js',
    'lib/collection.js',
    'lib/methods.js'
  ], 'server');

  api.export('SmartFile', ['client', 'server']);
});