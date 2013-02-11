var fs = require("fs");

exports.desc = "utility functions for shelly modules"
exports.functions = {
	list: {desc: 'list all shelly modules installed', params: {}, returns: {}, security: []},
};

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
