var _ = require('lodash');
var crypto = require('crypto');

var shutil = require(global.gBaseDir + '/src/shutil.js');

var db = global.db;

var object = exports;

object.desc = "generic object store"
object.functions = {
	create: {desc: 'get object', params: {className:{dtype:'string'}, object:{dtype:'object'}}, security: []},
	destroy: {desc: 'get object', params: {oid:{dtype:'string'}}, security: []},
	get: {desc: 'get object', params: {className:{dtype:'string'}, oid:{dtype:'string'}}, security: []},
	set: {desc: 'set object', params: {className:{dtype:'string'}, oid:{dtype:'string'}, object: {dtype: 'object'}}, security: []}
};

object.pre = function(req, res, cb)
{
	console.log('object.pre');
	var cmd = req.params.cmd;
	var className = req.params.className;
	var oid = req.params.oid;
	
	if(cmd == 'object.create') {
		cb(0);
		return;
	}
	
	// SWD - eventually check security session.uid has rights to object
	
	req.env.object = null;
	db.kget('kObject', [className, oid], function(err, value){
		if(value == null) {
			cb(1, shutil.error("object_get", "unable to get object", {className: className, oid: oid}));
			return;
		} else {
			var object = JSON.parse(value);
			req.env.object = object;
			cb(0);
			return;
		}
	});
}

object.post = function(req, res, cb)
{
	console.log('object.post');
	var object = req.env.object;
	
	if(req.env.object==null) {
		cb(1, shutil.error("object_null", "object is not valid to save"));
		return;
	}
	
	// get the hash by removing the info, re-hashing, and replacing info
	var info = object._info;
	delete object._info;
	var newHash = crypto.createHash('md5').update(JSON.stringify(object)).digest("hex");
	object._info = info;
	
	if(newHash != info.hash)
	{
		console.log("object modified - saving");
		object._info.hash = newHash;
		var ts = new Date().getTime();
		req.env.object._info.lastModified = ts;	
		var objectStr = JSON.stringify(object);
		db.kset('kObject', [object._info.className, object._info.oid], objectStr, function(err, res) {
			if(err != null) {
				cb(1, shutil.error("object_save", "unable to save object"));
				return;
			}
			cb(0);
			return;
		});
	} else {
		cb(0);
	}
}

object.create = function(req, res, cb)
{
	console.log('object.create');
	var className = req.params.className;
	
	var object = {};
	db.nextId('object-' + className, function(error, value) {
		// create the object
		var ts = new Date().getTime();
		object._info = {
			oid : value.toString(),
			className : className,
			created : ts,
			lastModified : ts,
			hash : ''
		};
		object = _.merge(object, req.params.object);
	
		req.env.object = object;
  	cb(0, object);
	});
}

object.destroy = function(req, res, cb)
{
	console.logl('object.destroy');
	cb(0);
}

object.get = function(req, res, cb)
{
	cb(0, req.env.object);
}

object.set = function(req, res, cb)
{
	var object = req.env.object
	var newObject = req.params.object;
	
	if(typeof(newObject._info) != 'undefined') {
		delete newObject._info; // never merge the info block;
	}

	req.env.object = _.merge(object, newObject);
	
	cb(0, req.env.object);
}