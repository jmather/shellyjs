var _ = require("lodash");

var shutil = exports;

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

function errorStr(error, module)
{
	var info = '';
	
	if(error == 0 ) {
		return info;
	}
	if(error < 100) {
		info = "system error";
	}
	if(typeof(module.errors) != 'undefined' && typeof(module.errors[error]) != undefined)
	{
		info = module.errors[error];
	}
	return info;
}

shutil.call = function(cmd, req, res, cb)
{
	console.log('cmd = ' + cmd);
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
		cb(1, {info: "unable to load module: " + moduleName});
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
			if(typeof(data) == 'undefined') {
				data = {cmd: cmd, info: errorStr(error, module)};
			}
			console.log("pre error: ", data);
			cb(error, data);
			return;
		}
		module[funcName](req, res, function(error, data) {
			var retError = error;
			var retData = data;
			if(error != 0) {
				if(typeof(data) == 'undefined') {
					data = {cmd: cmd, info: errorStr(error, module)};
				}
				console.log("func error: ", error, data);
				// bail out, no post as function failed
				cb(error, data);
				return;
			}
			module.post(req, res, function(error, data) {
				if(error != 0) {
					if(typeof(data) == 'undefined') {					
						data = {module: moduleName, function: funcName, info: errorStr(error, module)};
					}
					cb(error, data);
				} else {					
					cb(retError, retData);
				}
			});
		});
	});
}