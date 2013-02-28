var path = require("path");
var util = require("util");

var _ = require("lodash");
var stackTrace = require('stack-trace');

var shlog = require(global.gBaseDir + '/src/shlog.js');
var session = require(global.gBaseDir + '/src/session.js');  // used by fill session
var shUser = require(global.gBaseDir + '/src/shuser.js');  // used by fill session

var shutil = exports;

// SWD cut over to winston categories for prod
var gDebug = {
	"app": {},
}

var winston = require('winston');
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { colorize: true, timestamp: false });

shutil.log = function()
{
	// SWD disable module filter for prod
	var trace = stackTrace.get();
	
	var functionName = trace[1].getFunctionName();
	var idx = 1;
	if(functionName == 'shutil.info'
		 || functionName == 'shutil.debug'
		 || functionName == 'shutil.error') {
		idx = 2;
	}
	var callerFn = trace[idx].getFileName();
	var callerName = path.basename(callerFn, ".js");
	
	var args = Array.prototype.slice.call(arguments);
	var level = args.shift();
	
	if(typeof(gDebug[callerName]) != 'undefined') {
		var msg = util.format("%d - %s", process.pid, util.format.apply(this, args));
		winston.log(level, msg);
	}
}

shutil.info = function()
{
	var args = Array.prototype.slice.call(arguments);
	args.unshift("info");
	this.log.apply(this, args);
}

shutil.error = function()
{
	var args = Array.prototype.slice.call(arguments);
	args.unshift("info");
	this.log.apply(this, args);
}

shutil.event = function(event, data)
{
	if (typeof(data) == 'undefined') {
		data = null;
	}
	
	var resp = new Object();
	resp.event = event;
	resp.ts = new Date().getTime();
	resp.data = data;
	
	return resp;
}

shutil.error = function(code, message, data)
{
	var res = this.event("event.error", data);
	res.code = code;
	res.message = message;
	return res;
}

shutil.fillSession = function(req, res, cb) {
	if(!session.check(req.params.session)) {
		cb(1, shutil.event("event.error", {info: 'bad session token'}));
		return;
	}
	req.session = {};
	req.session.uid = req.params.session.split(':')[1];
	shlog.info("loading user: uid = " + req.session.uid);
	var user = new shUser();
	user.loadOrCreate(req.session.uid, function(error, data) {
		if(error != 0) {
			cb(1, shutil.event("event.error", {info: "unable to load user: " + req.session.uid}));
			return;
		}
		shlog.info("user loaded: " + req.session.uid);
		req.session.user = user;
		cb(0);
	});
}

shutil.call = function(cmd, req, res, cb)
{
	shlog.info('cmd = ' + cmd);
	var cmdParts = cmd.split('.');
	var moduleName = cmdParts[0];
	var funcName = cmdParts[1];	
	var cmdFile = global.gBaseDir + '/functions/' + moduleName + '/' + moduleName + '.js'
	
	// load module
	// SWD for now clear cache each time - will add server command to reload a module
	try {
		delete require.cache[require.resolve(cmdFile)];
		var module = require(cmdFile);
	} catch(e) {
		cb(1, shutil.error("module_require", "unable to load module", {name: moduleName, info: e.message}));
		return;
	}
	
	// validate params
	for (key in module.functions[funcName].params)
	{
		if(typeof(req.params[key])=='undefined')
		{
			cb(2, {cmd: cmd, info: "missing param: " + key});
			return;
		}
	}

	// init for modules to use to pass data
	if (typeof(req.env) == 'undefined') {
		req.env = {};
	}

	// ensure we have pre/post functions
	if(typeof(module.pre) != 'function') {
		shlog.info('no pre - using default');
		module.pre = function(req, res, cb) {cb(0);}
	}
	if(typeof(module.post) != 'function') {
		shlog.info('no post - using default');
		module.post = function(req, res, cb) {cb(0);}
	}
	
	// call the pre, function, post sequence
	module.pre(req, res, function(error, data) {
		if(error != 0) {
			shlog.info("pre error: ", data);
			cb(error, data);
			return;
		}
		module[funcName](req, res, function(error, data) {
			var retError = error;
			var retData = data;
			if(error != 0) {
				// bail out, no post as function failed
				shlog.info("func error: ", error, data);
				cb(error, data);
				return;
			}
			module.post(req, res, function(error, data) {
				if(error != 0) {
					cb(error, data);
				} else {
					// return data from actual function call
					cb(retError, retData);
				}
			});
		});
	});
}