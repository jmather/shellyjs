// all constants up front for requires
var gPort = 5101;
global.gBaseDir = '/Users/scott/git/shelly';

var util = require('util');
var http = require('http');
var restify = require('restify');
var winston = require('winston');

var admin  = require('../src/admin.js');
//util.puts(process.cwd());
		
var server = restify.createServer({
	name: "shelly",
});
server.use(restify.bodyParser());

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
	delete require.cache[require.resolve(cmdFile)]
	var module = require(cmdFile);
	var data = module[funcName](req);
	
	res.send(JSON.stringify(data));
}