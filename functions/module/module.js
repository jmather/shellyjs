var fs = require("fs");

exports.desc = "utility functions for shelly modules"
exports.functions = {
	list: {desc: 'list all modules installed', params: {}, security: [], example: {}},
	info: {desc: 'get info for a single module', params: {name:{dtype:'string'}}, security: [], example: {name:'module'}}
};

function getInfo(name)
{
	console.log("getInfo name="+name);
	var funcDir = global.gBaseDir + '/functions';	
	var cmdFile = funcDir + '/' + name + '/' + name + '.js';
	delete require.cache[require.resolve(cmdFile)];
	var funcModule = require(cmdFile)
	var m = new Object();
	m.name = name;
	m.author = 'scott';
	if(typeof(funcModule.desc)=='undefined') {
		funcModule.desc = 'none';
	}
	m.desc = funcModule.desc;
	m.functions = funcModule.functions;
	return m;
}

exports.info = function(req, res, cb)
{
	console.log("module.info name="+req.params.name);
	var m = getInfo(req.params.name);
	cb(null, m);
}

exports.list = function(req, res, cb)
{
	var modules = new Object();
	var funcDir = global.gBaseDir + '/functions';
	var files = fs.readdirSync(funcDir);
	files.forEach(function(entry){
		var fn = funcDir + '/' + entry;
		var stat = fs.statSync(fn);
		if(stat.isDirectory())
		{
			var cmdFile = funcDir + '/' + entry + '/' + entry + '.js';
			delete require.cache[require.resolve(cmdFile)];
			var funcModule = require(cmdFile)
			var m = new Object();
			m.name = entry;
			m.author = 'scott';
			if(typeof(funcModule.desc)=='undefined') {
				funcModule.desc = 'none';
			}
			m.desc = funcModule.desc;
			m.functions = funcModule.functions;
			modules[m.name] = m;
		}
	})
	cb(null, modules);
}

function getAllMethods(object) {
    return Object.getOwnPropertyNames(object).filter(function(property) {
        return typeof object[property] == 'function';
    });
}		
