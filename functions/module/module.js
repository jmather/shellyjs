var fs = require("fs");

var shlog = require(global.gBaseDir + '/src/shlog.js');

exports.desc = "utility functions for shelly modules"
exports.functions = {
	list: {desc: 'list all modules installed', params: {}, security: []},
	info: {desc: 'get info for a single module', params: {name:{dtype:'string'}}, security: []}
};

function getInfo(name)
{
	shlog.info("getInfo name="+name);
	var funcDir = global.gBaseDir + '/functions';	
	var cmdFile = funcDir + '/' + name + '/' + name + '.js';
	
	var m = new Object();
	m.error = 0;
	m.path = cmdFile;
	m.name = name;
	m.author = 'scott';
	m.desc = 'none';
	m.functions = {};
	
	try {
		delete require.cache[require.resolve(cmdFile)];
		var funcModule = require(cmdFile)
	} catch(e) {
		m.error = 100;
		m.info = "unable to load module";
		return m;
	}
	if(typeof(funcModule.desc) != 'undefined') {
		m.desc = funcModule.desc;
	}
	if(typeof(funcModule.functions) != 'undefined') {
		m.functions = funcModule.functions;
	}
	return m;
}

exports.info = function(req, res, cb)
{
	shlog.info("module.info name="+req.params.name);
	var m = getInfo(req.params.name);
	cb(m.error, m);
}

exports.list = function(req, res, cb)
{
	var modules = new Object();
	var funcDir = global.gBaseDir + '/functions';
	var files = fs.readdirSync(funcDir);
	var error = 0;
	files.forEach(function(entry){
		var fn = funcDir + '/' + entry;
		var stat = fs.statSync(fn);
		if(stat.isDirectory())
		{
			var m = getInfo(entry);
			if(m.error) {
				error = 101;
			}
			modules[m.name] = m;
		}
	})
	cb(error, modules);
}

function getAllMethods(object) {
    return Object.getOwnPropertyNames(object).filter(function(property) {
        return typeof object[property] == 'function';
    });
}		
