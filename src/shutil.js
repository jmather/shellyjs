

var shutil = exports;

shutil.wrapper = function(cmd, session, data)
{
	if (typeof(data) == 'undefined') {
		data = null;
	}

	var wrapper = new Object();
	wrapper.cmd = cmd;
	wrapper.session = session;
	wrapper.ts = new Date().getTime();
	wrapper.error = 1;			// default to error, function must clear
	wrapper.info = '';
	wrapper.data = data;
	
	return wrapper;
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
			cb(2, {cmdtt: cmd, info: "missing param: " + key});
			return;
//			wrapper.error = 1;
//			// TODO: SWD strip param name for production
//			wrapper.info = 'missing param: '+key;
//			console.log(wrapper);
//			res.send(wrapper);
//			return next();
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
			cb(error, data);
			return;
		}
		module[funcName](req, res, function(error, data) {
			var retError = error;
			var retData = data;
			if(error != 0) {
				if(typeof(data) != 'object') {
					data = {cmd: cmd, info: errorStr(error, module)};
				}
				console.log("func error: ", data);
				// bail out, no post as function failed
				cb(error, data);
				return;
			}
			module.post(req, res, function(error, data) {
				if(error != 0) {
					data = {module: moduleName, function: funcName, info: errorStr(error, module)};
					cb(error, data);
				} else {					
					cb(retError, retData);
				}
			});
		});
	});
}