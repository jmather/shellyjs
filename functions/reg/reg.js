var util = require('util');
var crypto = require('crypto');
var check = require('validator').check;
var sanitize = require('validator').sanitize;
var sh = require(global.gBaseDir + '/src/shutil.js');
var session = require(global.gBaseDir + '/src/session.js');

var gDb = global.db;

var passwordSecret = '94d634f9-c273-4d59-9b28-bc26185d656f';
var passwordVersion = 1;

exports.desc = "handles user login/logout and new user registration"
exports.functions = {
	create: {desc: 'user login',	params: {email: {dtype:"string"}, password: {dtype:'string'}},	security: []},
	check: {desc: 'check if user exists',	params: {email: {dtype:"string"}},	security: []},
	login: {desc: 'user login',	params: {email: {dtype:"string"}, password: {dtype:'string'}},	security: []},
	logout: {desc: 'user logout',	params: {},	security: []}
}

function hashPassword(uid, password)
{
	var secStr = util.format('uid=%s;pw=%s;secret=%s', uid, password, passwordSecret);
	return passwordVersion + ':' + crypto.createHash('md5').update(secStr).digest("hex");
}

function checkPassword(uid, password, hash)
{
	newHash = hashPassword(uid, password)
	return newHash == hash;
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
	
	gDb.kget('kEmailMap', email, function (error, value) {
		if(value==null)	{
			cb(1, sh.error("email_notfound", "email is not registered", {email: email}));
			return;
		} else {
			out = JSON.parse(value);
			
			// check password
			if(checkPassword(out.uid, password, out.password)) {
				out.session = session.create(out.uid);
				out.check = session.check(out.session);
				cb(0, out);
				return;			
			} else {
				cb(1, sh.error("password_bad", "incorrect password", {email: email}));
				return;
			}
		}
	});	
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
		check(email, "invalid email").isEmail();
		check(password, "invalid passwrod").len(6);
	} catch (e) {
		cb(1, sh.error("params_bad", "email or password is not valid", {info: e.message}));
		return;
	}
	
	gDb.kget('kEmailMap', email, function (error, value) {
		if(value!=null) {
			cb(1, sh.error("email_used", "this email is already registered", {email: email}));
			return;
		} else {
			db.nextId('user', function(error, value) {
				// create the user
				out.uid = value;
				out.session = session.create(out.uid);		
				out.email = email;
				out.password = hashPassword(out.uid, password);
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
		if(value!=null) {
			cb(0, JSON.parse(value));
			return;
		} else {
			cb(1, sh.error("unregistered", "this email is not registered", {email: email}));
			return;
		}
	});
}