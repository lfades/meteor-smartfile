Package.describe({
  summary: 'Smartfile integration for meteor',
  version: '0.2.3',
  git: 'https://github.com/Goluis/meteor-smartfile.git'
});

Package.onUse(function (api) {
  api.versionsFrom('METEOR@0.9.1');

  api.use('mongo', ['client', 'server']);
  api.use('underscore', ['client', 'server']);
  api.use('blaze', 'client');
  api.use('http', 'server');

  Npm.depends({'form-data': '0.1.2'});

  api.addFiles('common.js', ['server', 'client']);
  api.addFiles('client.js', 'client');
  api.addFiles('server.js', 'server');

  api.export('SmartFile', ['client', 'server']);
});