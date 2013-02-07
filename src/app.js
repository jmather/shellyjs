var util = require('util');
var http = require('http');
var restify = require('restify');
var winston = require('winston');


var gPort = 5101;
var reqTest = {"cmd":"reg", "data":"pong"};
		
var server = restify.createServer({
	name: "shelly",
}
)
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
	var module = cmdParts[0];
	var func = cmdParts[1];
	
	// locate module and fire function
	// SWD for now clear cache each time - will add server command to reload a module
	var cmdFile = '../functions/' + module + '.js'
	delete require.cache[require.resolve(cmdFile)]
	data = require(cmdFile)[func](req);
	
	res.send(JSON.stringify(data));
}
		



/*
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
//  res.write('hello, your kung foo is strong. Yes strong - hit me')
	var cmdFile = '../functions/'+reqTest['cmd']+'.js'
	delete require.cache[require.resolve(cmdFile)]
	testData = require(cmdFile).login(req);
  res.write(JSON.stringify(testData));
  res.end();
}).listen(5101);
util.puts('> shelly server running on port '+gPort);
*/

