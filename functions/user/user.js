var _ = require('lodash');

var db = global.db;

var user = exports;

user.desc = "utility functions for shelly modules"
user.functions = {
	get: {desc: 'get user object', params: {uid:{dtype:'string'}}, security: []},
	set: {desc: 'set user object', params: {uid:{dtype:'string'}, user: {dtype: 'object'}}, security: []}
};

user.errors = {
	100: "get user object failed",
	101: "set user object failed",
	102: "set user object failed, unable to load merge"
}

user.pre = function(req, res, cb)
{
	console.log('user.pre');
	var uid = req.params.uid;
	
	// SWD - eventually check security session.uid has rights to params.uid
	
	db.kget('kUser', uid, function(err, value){
		if(value == null) {
			cb(100);
			return;
		}
		var user = JSON.parse(value);
		req.env.user = user;
		cb(0);
	});
}

user.post = function(req, res, cb)
{
	console.log('user.post');
	var uid = req.params.uid;	
	
	var userStr = JSON.stringify(req.env.user);
	db.kset('kUser', uid, userStr, function(err, res) {
		if(err != null) {
			cb(101);
			return;
		}
		cb(0);
	});
}

user.get = function(req, res, cb)
{
	cb(0, req.env.user);
}

user.set = function(req, res, cb)
{
	var user = req.env.user
	var newUser = req.params.user;

	req.env.user = _.merge(user, newUser);
	
	cb(0, req.env.user);
}