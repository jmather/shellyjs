
var db = global.db;

var user = exports;

user.desc = "utility functions for shelly modules"
user.functions = {
	get: {desc: 'get user object', params: {uid:{dtype:'string'}}, security: []},
	set: {desc: 'set user object', params: {uid:{dtype:'string'}, user: {dtype: 'object'}}, security: []}
};

user.errors = {
	100: "get user object failed",
	101: "set user object failed"
}

user.get = function(req, res, cb)
{
	db.kget('kUser', req.params.uid, function(err, value){
		if(value == null) {
			cb(100);
			return;
		}
		cb(0, JSON.parse(value));
	});
}

user.set = function(req, res, cb)
{
	var uid = req.params.uid;
	var user = req.params.user;
	var userStr = JSON.stringify(user);
	db.kset('kUser', uid, userStr, function(err, res) {
		if(err != null) {
			cb(101);
			return;
		}
		cb(0, user);
	});
}