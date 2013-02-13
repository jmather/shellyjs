var check = require('validator').check;
var sanitize = require('validator').sanitize;
var session = require(global.gBaseDir + '/src/session.js');

var gDb = global.db;

exports.desc = "handles user login/logout and new user registration"
exports.functions = {
	login: {desc: 'user login',	params: {email: {dtype:"string"}, password: {dtype:'string'}},	security: []},
	logout: {desc: 'user login',	params: {email: {dtype:"string"}, password: {dtype:'string'}},	security: []},
	create: {desc: 'user login',	params: {email: {dtype:"string"}, password: {dtype:'string'}},	security: []},
	check: {desc: 'check if user exists',	params: {email: {dtype:"string"}},	security: []}
}
exports.errors = {
		100:'user already created',
		101:'user does not exist',
		102:'bad user name',
		103:'bad password'	
}

exports.login = function(req, res, cb)
{
	var out = new Object();
	
	var email = sanitize(req.params.email).trim();
	var password = sanitize(req.params.password).trim();
	console.log(email);
	try {
		check(email, 102).isEmail();
	} catch (e) {
		cb(e.message);
		return;
	}
	
	var uid = 1;
	out.session = session.create(uid);
	cb(0, out);
	
}

exports.logout = function(req, res, cb)
{
	cb(null, {"reg.logout":"foo foo foo"});
}

exports.create = function(req, res, cb)
{
	var out = new Object();

	var email = sanitize(req.params.email).trim();
	var password = sanitize(req.params.password).trim();
	try {
		check(email, 102).isEmail();
		check(password, 103).len(6);
	} catch (e) {
		cb(e.message);
		return;
	}
	
	gDb.kget('kEmailMap', email, function (error, value) {
		if(value!=null)
		{
			cb(100);
			return;
		} else {
			db.nextId('user', function(error, value) {
				// create the user
				out.uid = value;
				out.session = session.create(out.uid);		
				out.email = email;
				out.password = password;
				var ts = new Date().getTime();
				out.created = ts;
				out.lastModified = ts;
				gDb.kset('kEmailMap', req.params.email, JSON.stringify(out));
				cb(0, out);
				return;
			});
		}
	});	
}

exports.check = function(req, res, cb)
{
	var out = new Object();
	
	var email = sanitize(req.params.email).trim();
	try {
		check(email, 102).isEmail();
	} catch (e) {
		cb(e.message);
		return;
	}	
	
	gDb.kget('kEmailMap', email, function (error, value) {
		if(value!=null)
		{
			cb(0, JSON.parse(value));
			return;
		} else {
			cb(101)
			return;
		}
	});
}