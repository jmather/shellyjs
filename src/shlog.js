var path = require("path");
var util = require("util");

var stackTrace = require('stack-trace');

var shlog = exports;

var gDebug = {
	"app": {},
	"admin": {},
//	"game": {},
	"live": {},
}

var winston = require('winston');
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { colorize: true, timestamp: false });

shlog.log = function()
{
	// SWD disable module filter for prod
	var trace = stackTrace.get();	
	var callerFn = trace[1].getFileName();
	var callerName = path.basename(callerFn, ".js");	
	if(callerName == 'shlog') { // ignore calls from this module
		callerFn = trace[2].getFileName();
		callerName = path.basename(callerFn, ".js");	
	}
	
	var args = Array.prototype.slice.call(arguments);
	var level = args.shift();
	
	if(typeof(gDebug[callerName]) != 'undefined') {
//		var msg = util.format("%d - %s", process.pid, util.format.apply(this, args));
		var msg = util.format("%s - %s", callerName, util.format.apply(this, args));
		winston.log(level, msg);
	}
}

shlog.info = function()
{
	var args = Array.prototype.slice.call(arguments);
	args.unshift("info");
	this.log.apply(this, args);
}

shlog.error = function()
{
	var args = Array.prototype.slice.call(arguments);
	args.unshift("info");
	this.log.apply(this, args);
}