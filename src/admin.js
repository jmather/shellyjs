var express = require('express');
var fs = require('fs');
var mustache = require('mustache');

var gAdminPort = 5100;

var app = express();

//app.get('/', function(req, res){
//    res.send('Hello World');
//});

var adminBase = __dirname + '/../admin';
console.log('admin directory: ' + adminBase);
app.use(express.static(adminBase));

app.get('/', function(req, res) {
    fs.readFile(adminBase + '/index.htm', 'utf8', function(err, text){
        res.send(text);
    });
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