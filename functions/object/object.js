var _ = require('lodash');

var db = global.db;

var object = exports;

object.desc = "generic object store"
object.functions = {
	create: {desc: 'get object', params: {className:{dtype:'string'}, object:{dtype:'object'}}, security: []},
	destroy: {desc: 'get object', params: {oid:{dtype:'string'}}, security: []},
	get: {desc: 'get object', params: {className:{dtype:'string'}, oid:{dtype:'string'}}, security: []},
	set: {desc: 'set object', params: {className:{dtype:'string'}, oid:{dtype:'string'}, object: {dtype: 'object'}}, security: []}
};

object.errors = {
	100: "get object failed",
	101: "set object failed",
	102: "set object failed, unable to load merge",
	103: "object already exists",
	104: "unable to save null object"
}

object.pre = function(req, res, cb)
{
	console.log('object.pre');
	var cmd = req.params.cmd;
	var className = req.params.className;
	var oid = req.params.oid;
	
	// SWD - eventually check security session.uid has rights to object
	
	req.env.object = null;
	db.kget('kObject', [className, oid], function(err, value){
		if(value == null) {
			if(cmd == 'object.create')
			{
				cb(0);  // create call and no object - ok
			} else {
				cb(100); // not create and no object - error
			}
			return;
		} else {
			if(cmd == 'object.create')
			{
				cb(103); // create and object exists - error
			} else {
				var object = JSON.parse(value);
				req.env.object = object;
				cb(0);
			}
			return;
		}
	});
}

object.post = function(req, res, cb)
{
	console.log('object.post');
	var object = req.env.object;
	
	if(req.env.object==null) {
		cb(104);
		return;
	}
	
	var objectStr = JSON.stringify(object);
	db.kset('kObject', [object.className, object.oid], objectStr, function(err, res) {
		if(err != null) {
			cb(101);
			return;
		}
		cb(0);
	});
}

object.create = function(req, res, cb)
{
	console.log('object.create');
	var className = req.params.className;
	
	var object = {};
	db.nextId('object-' + className, function(error, value) {
		// create the object
		object.oid = value.toString();
		object.className = className;
		var ts = new Date().getTime();
		object.created = ts;
		object.lastModified = ts;
		object.data = req.params.object;
	
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

	req.env.object.data = _.merge(object.data, newObject);
	var ts = new Date().getTime();
	req.env.object.lastModified = ts;
	
	cb(0, req.env.object);
}