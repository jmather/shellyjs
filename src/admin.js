var express = require('express');
var fs = require('fs');
var path = require('path');
//var mustache = require('mustache');
//var hulk = require('hulk-hogan');
//var expressHogan = require('express-hogan.js');

var gAdminPort = 5100;
var adminBase = global.gBaseDir + '/admin';
var adminStatic = adminBase + '/static';
console.log('admin directory: ' + adminBase);
console.log('admin static directory: ' + adminStatic);

var app = express();
app.use(express.static(adminStatic));

app.set('view engine', 'html');
app.set('layout', 'layout'); // rendering by default
app.set('view options', {layout: false});  // SWD turn layouts off - not sure this works with hogan
//app.set('partials', {head:"head"}); // partails using by default on all pages
app.enable('view cache');
app.set('views', adminBase);
app.engine('html', require('hogan-express'));
//app.engine('hjs', expressHogan.renderFile); // mustache templates

app.use('/', function(req, res, next) {
  console.log('%s %s', req.method, req.url);
	
	res.render(path.basename(req.url), {});
	next();
});

app.get('/', function(req, res) {
	res.locals = {};
	res.render("index", {});
});

app.get('/test', function(req, res) {
 var view = {
  title: "Joe",
  calc: function() {
    return 2 + 4;
  }
 };
 var template = "{{title}} spends {{calc}}";
 var html = mustache.to_html(template, view);
 res.send(html);
});

var adminServer = app.listen(gAdminPort);
console.log('Admin server started on port %d', adminServer.address().port);