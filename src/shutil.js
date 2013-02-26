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

shutil.error = function(code, message, data)
{
	var res = this.event("event.error", data);
	res.code = code;
	res.message = message;
	return res;
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
			cb(error, data);
			return;
		}
		module[funcName](req, res, function(error, data) {
			var retError = error;
			var retData = data;
			if(error != 0) {
				// bail out, no post as function failed
				console.log("func error: ", error, data);
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