var express = require('express');
var fs = require('fs');
var path = require('path');
var engines = require('consolidate');
var hogan = require('hogan.js');

var shlog = require(global.gBaseDir + '/src/shlog.js');

var gAdminPort = 5100;
var adminBase = global.gBaseDir + '/admin';
var adminStatic = adminBase + '/static';
var adminGames = adminBase + '/games';

shlog.info('admin directory: ' + adminBase);
shlog.info('admin static directory: ' + adminStatic);

var app = express();
//app.use(express.basicAuth(function(user, pass){
//  return 'scott' == user & 'foo' == pass;
//}));
app.use(express.favicon(adminStatic + '/images/favicon.ico'));
app.use('/static', express.static(adminStatic));
app.use('/games', express.static(adminGames));

app.set('view engine', 'html');
app.set('layout', 'layout'); // rendering by default
app.set('view options', {layout: false});  // SWD turn layouts off - not sure this works with hogan
//app.set('partials', {head:"head"}); // partials using by default on all pages
//app.enable('view cache');  // disable this for dev
app.set('views', adminBase);
app.engine('html', engines.hogan);

app.get('/test', function (req, res) {
  var view = {
    title: "Joe",
    calc: function () {
      return 2 + 4;
    }
  };
  var template = hogan.compile("{{title}} spends {{calc}}");
  var html = template.render(view);
  res.send(html);
});

app.get('/menu_1.html', function (req, res) {
  shlog.info("in menu_1");
  var modulePack = require(global.gBaseDir + '/functions/module/module.js');
  var map = {};
  map.user = 'Scott';
  modulePack.list(req, res, function (err, data) {
    map.modules = JSON.stringify(data);
    res.render(path.basename(req.url), map);
  });
});

app.get('/function', function (req, res) {
  res.send("here");
});

app.get('/testgame.html', function (req, res) {
  shlog.info("in testgame");
  var map = {};
  map.module = "game";
  var cmdFile = global.gBaseDir + '/functions/' + map.module + '/' + map.module + '.js';
  delete require.cache[require.resolve(cmdFile)];
  var modulePack = require(cmdFile);
  map.functions = modulePack.functions;
  res.render('testgame.html', {params: JSON.stringify(map)});
});

app.get('/function/:module/:function', function (req, res) {
  console.log("here");
  var map = {};
  map.module = req.param("module");
  map.function = req.param("function");
  var cmdFile = global.gBaseDir + '/functions/' + map.module + '/' + map.module + '.js';
  delete require.cache[require.resolve(cmdFile)];
  var modulePack = require(cmdFile);
  map.functions = modulePack.functions;
  map.desc = modulePack.desc;
  res.render('function.html', {params: JSON.stringify(map)});
});

app.get('*.html', function (req, res) {
  shlog.info('%s %s', req.method, req.url);
  res.render(path.basename(req.url), {});
});

var adminServer = app.listen(gAdminPort);
shlog.info('Admin server started on port %d', adminServer.address().port);