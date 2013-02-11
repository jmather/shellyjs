var express = require('express');
var fs = require('fs');
var path = require('path');
var engines = require('consolidate');
var hogan = require('hogan.js');

var gAdminPort = 5100;
var adminBase = global.gBaseDir + '/admin';
var adminStatic = adminBase + '/static';
console.log('admin directory: ' + adminBase);
console.log('admin static directory: ' + adminStatic);

var app = express();
//app.use(express.basicAuth(function(user, pass){
//  return 'scott' == user & 'foo' == pass;
//}));
app.use(express.favicon(adminStatic + '/images/favicon.ico')); 
app.use(express.static(adminStatic));

app.set('view engine', 'html');
app.set('layout', 'layout'); // rendering by default
app.set('view options', {layout: false});  // SWD turn layouts off - not sure this works with hogan
//app.set('partials', {head:"head"}); // partails using by default on all pages
//app.enable('view cache');  // disable this for dev
app.set('views', adminBase);
app.engine('html', engines.hogan);

app.get('/test', function(req, res) {
 var view = {
  title: "Joe",
  calc: function() {
    return 2 + 4;
  }
 };
 var template = hogan.compile("{{title}} spends {{calc}}");
 var html = template.render(view);
 res.send(html);
});

app.get('/menu_1.html', function(req, res) {
	var modulePack = require(global.gBaseDir + '/functions/module/module.js');
	console.log("in menu");
	var map  = new Object();
	map.user = 'Scott';
	console.log(modulePack.list.toString());
	map.modules = modulePack.list(req, res, function(err, data) {
//		map.modules = data.modules;
		map.modules = JSON.stringify(data.modules);
//	console.log(JSON.stringify(map.modules));
		res.render(path.basename(req.url), map);	
	});
});

app.get('*.html', function(req, res) {
  console.log('%s %s', req.method, req.url);	
	res.render(path.basename(req.url), {});	
});

var adminServer = app.listen(gAdminPort);
console.log('Admin server started on port %d', adminServer.address().port);