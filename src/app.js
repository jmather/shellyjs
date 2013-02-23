// all constants up front for requires
var gPort = 5101;
global.gBaseDir = '/Users/scott/git/shelly';

var util = require('util');
var http = require('http');
var restify = require('restify');
var winston = require('winston');

var shutil = require(global.gBaseDir + '/src/shutil.js');
var session = require(global.gBaseDir + '/src/session.js');

global.db = require(global.gBaseDir + '/src/shdb.js');

var admin  = require('../src/admin.js');

global.live  = require('../src/live.js');
global.live.start();
		
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
		var wrapper = shutil.wrapper(cmd, psesion, null);
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

function setWrapper(error, data, wrapper, module) {
	wrapper.error = error;
	wrapper.info = errorStr(error, module);
	if(typeof(data) != 'undefined') {
		if(typeof(data) == 'object') {
			wrapper.data = data;
		} else {
			wrapper.data = data.toString();
		}
	}
	return wrapper;
}

function respond(req, res, next) {
	util.puts('cmd = ' + req.params.cmd);
	// SWD think restify should be doing this for us - or we are missing a setting
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
	
	// default return wrapper
	var wrapper = shutil.wrapper(req.params.cmd, req.params.sesion, null);
	
	
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
			console.log("pre error: ", data);
			wrapper = setWrapper(error, data, wrapper, module);
			res.send(wrapper);
			return;
		}
		module[funcName](req, res, function(error, data) {
			wrapper = setWrapper(error, data, wrapper, module);
			wrapper.info = errorStr(error, module);
			if(error != 0) {
				// bail out, no post as function failed
				console.log("func error: ", data);
				res.send(wrapper);
				return;
			}
			module.post(req, res, function(error, data) {
				console.log("post error: ", data);
				if(error != 0) {
				// SWD right now treat this has a hard error and overwrite the data
					wrapper = setWrapper(error, data, wrapper, module);
				}
				res.send(wrapper);
				return;
			});
		});
	});
	// SWD not sure we want to next() on async while functions are getting called
	return next();
}