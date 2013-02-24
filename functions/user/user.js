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
	// user is always preloaded now
	
	// SWD - eventually check security session.uid has rights to params.uid
	cb(0);
/*	
	db.kget('kUser', uid, function(err, value){
		if(value == null) {
			cb(100);
			return;
		}
		var user = JSON.parse(value);
		if(typeof(user) != 'object') {
			// something went very wrong
			user = {};
		}
		req.env.user = user;
		cb(0);
	});
*/
}

user.post = function(req, res, cb)
{
	console.log('user.post');
	var uid = req.params.uid;
	// SWD: work out pre/post user save later, for now save on every set
	cb(0);
/*	
	var userStr = JSON.stringify(req.env.user);
	db.kset('kUser', uid, userStr, function(err, res) {
		if(err != null) {
			cb(101);
			return;
		}
		cb(0);
	});
	*/
}

user.get = function(req, res, cb)
{
	console.log(req.env.user);
	cb(0, req.session.user.getData());
}

user.set = function(req, res, cb)
{
	var newUser = req.params.user;

	req.session.user.setData(newUser);

	cb(0, req.session.user.getData());
}