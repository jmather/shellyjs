// all constants up front for requires
var gPort = 5101;
global.gBaseDir = '/Users/scott/git/shelly';

var util = require('util');
var http = require('http');
var restify = require('restify');
var winston = require('winston');

global.db = require(global.gBaseDir + '/src/shdb.js');
global.db.set('1', JSON.stringify({name:"scott"}));
//global.db.get('test', function (err, value) {
//	console.log('test=' + value)
//});

var admin  = require('../src/admin.js');
//util.puts(process.cwd());
		
var server = restify.createServer({
	name: "shelly",
});
//server.use(restify.acceptParser(server.acceptable));
//server.use(restify.authorizationParser());
//server.use(restify.dateParser());
//server.use(restify.queryParser());
//server.use(restify.bodyParser());
/*
server.use(restify.throttle({
  burst: 100,
  rate: 50,
  ip: true, // throttle based on source ip address
  overrides: {
    '127.0.0.1': {
      rate: 0, // unlimited
      burst: 0
    }
  }
}));
*/
server.use(restify.bodyParser());
/*
server.use(
  function crossOrigin(req,res,next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    return next();
  }
);
*/

server.get('/hello', function(req, res, next) {
	res.send("hello");
	return next();
});

server.post('/api', respond);
server.post('/api/:version', respond);

server.listen(gPort, function() {
	console.log('%s listening at %s', server.name, server.url);
});

function respond(req, res, next) {
	util.puts('cmd = ' + req.params.cmd);
	
	// get cmd to fire
	var cmdParts = req.params.cmd.split('.');
	var moduleName = cmdParts[0];
	var funcName = cmdParts[1];
	
	// locate module and fire function
	// SWD for now clear cache each time - will add server command to reload a module
	var cmdFile = global.gBaseDir + '/functions/' + moduleName + '/' + moduleName + '.js'
	delete require.cache[require.resolve(cmdFile)];
	var module = require(cmdFile);
	module[funcName](req, res, function(err, data) {
		// SWD think restify should be doing this for us - or we are missing a setting
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
		
		res.send(data);
		
	});
	next();
}