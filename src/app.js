// all constants up front for requires
var gPort = 5101;
global.gBaseDir = '/Users/scott/git/shelly';

var util = require('util');
var http = require('http');
var restify = require('restify');
var winston = require('winston');

var session = require(global.gBaseDir + '/src/session.js');

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
server.use(restify.acceptParser(server.acceptable));
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

function getWrapper(req)
{
	var wrapper = new Object();
	wrapper.cmd = req.params.cmd;
	wrapper.session = req.params.session;
	wrapper.ts = new Date().getTime();
	wrapper.error = 1;			// default to error, function must clear
	wrapper.info = '';
	wrapper.data = {};
	return wrapper;
}

server.use(function(req, res, next) {
	console.log('session check');
	var cmd = req.params.cmd;
	if(cmd == 'reg.login' || cmd == 'reg.create' || cmd == 'reg.check')
	{
		return next();
	}
	var psession = req.params.session;
	// SWD - should grab user object out of check and stuff into req.session
	if(!session.check(psession)) {
	  res.header("Access-Control-Allow-Origin", "*");
	  res.header("Access-Control-Allow-Headers", "X-Requested-With");	
		var wrapper = getWrapper(req);
		wrapper.error = 1;
		wrapper.info = "bad session";
		res.send(wrapper);
		return next();
	}
	req.session = {};
	req.session.uid = psession.split(':')[1];
	console.log("session OK: uid = " + req.session.uid);
	return next();
}
);

server.get('/hello', function(req, res, next) {
	res.send("hello");
	return next();
});

server.post('/api', respond);
server.post('/api/:version', respond);

server.listen(gPort, function() {
	console.log('%s listening at %s', server.name, server.url);
});

function errorStr(error, module)
{
	var info = '';
	if(error != 0 && typeof(module.errors) != 'undefined' && typeof(module.errors[error]) != undefined)
	{
		info = module.errors[error];
	}
	return info;
}

function respond(req, res, next) {
	util.puts('cmd = ' + req.params.cmd);
	// SWD think restify should be doing this for us - or we are missing a setting
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
	
	// default return wrapper
	var wrapper = getWrapper(req);
	
	// get cmd to fire
	var cmdParts = req.params.cmd.split('.');
	var moduleName = cmdParts[0];
	var funcName = cmdParts[1];
	var cmdFile = global.gBaseDir + '/functions/' + moduleName + '/' + moduleName + '.js'
	
	// load module
	// SWD for now clear cache each time - will add server command to reload a module
	delete require.cache[require.resolve(cmdFile)];
	var module = require(cmdFile);
	
	// validate params
	for (key in module.functions[funcName].params)
	{
		if(typeof(req.params[key])=='undefined')
		{
			wrapper.error = 1;
			// TODO: SWD strip param name for production
			wrapper.info = 'missing param: '+key;
			console.log(wrapper);
			res.send(wrapper);
			return next();
		}
	}

	// init for modules to use to pass data
	req.env = {};

	// ensure we have pre/post functions
	if(typeof(module.pre) != 'function') {
		console.log('no pre - using default');
		module.pre = function(req, res, cb) {cb(0);}
	}
	if(typeof(module.post) != 'function') {
		console.log('no post - using default');
		module.post = function(req, res, cb) {cb(0);}
	}
	
	// call the pre, function, post sequence
	module.pre(req, res, function(error, data) {
		if(error != 0) {
			wrapper.error = error;
			wrapper.info = errorStr(error, module);
			res.send(wrapper);
			return;
		}
		module[funcName](req, res, function(error, data) {
			// default returns
			wrapper.error = error;
			wrapper.info = errorStr(error, module);
			if(data != null && typeof(data) != undefined)
			{
				wrapper.data = data;
			}
			module.post(req, res, function(error, data) {
				// SWD right now treat this has a hard error, but should be able to retry or something
				if(error != 0) {
					wrapper.error = error;
					wrapper.info = errorStr(error, module);
					wrapper.data = {};  // clear the data that was not saved;
					res.send(wrapper);
					return;
				} else {				
					res.send(wrapper);
					return;
				}
			});
		});
	});
	// SWD not sure we want to next() on async while functions are getting called
	return next();
}