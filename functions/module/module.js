var fs = require("fs");

exports.list = function(req, res, cb)
{
	var modules = new Object;
	var funcDir = global.gBaseDir + '/functions';
	var files = fs.readdirSync(funcDir);
	files.forEach(function(entry){
		var fn = funcDir + '/' + entry;
		var stat = fs.statSync(fn);
		if(stat.isDirectory())
		{
			var module = require(funcDir + '/' + entry + '/' + entry + '.js')
			modules[entry] = getAllMethods(module);
		}
	})
	cb(null, modules);
}

function getAllMethods(object) {
    return Object.getOwnPropertyNames(object).filter(function(property) {
        return typeof object[property] == 'function';
    });
}		
