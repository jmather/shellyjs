
var gDb = global.db;

exports.desc = "handles user login/logout and new user registration"
exports.functions = {
	login: {desc: 'user login',	params: {email: {dtype:"string"}, password: {dtype:'string'}},	security: []},
	logout: {desc: 'user login',	params: {email: {dtype:"string"}, password: {dtype:'string'}},	security: []},
	create: {desc: 'user login',	params: {email: {dtype:"string"}, password: {dtype:'string'}},	security: [], errors: {
		100:'user already created',
		101:'bad user name',
		102:'bad password'
		}
	},
	check: {desc: 'check if user exists',	params: {email: {dtype:"string"}},	security: [], errors: {
		100:'user does not exist',
		101:'bad user name'
		}
	}
}

exports.login = function(req, res, cb)
{
	cb(null, {"reg.login":"foo foo foo"});
}

exports.logout = function(req, res, cb)
{
	cb(null, {"reg.logout":"foo foo foo"});
}

exports.create = function(req, res, cb)
{
	var out = new Object();
	
	gDb.kget('kEmailMap', req.params.email, function (error, value) {
		if(value!=null)
		{
			cb(100);
		} else {
			// create the user
			out.email = req.params.email;
			out.password = req.params.password;
			var ts = new Date().getTime();
			out.created = ts;
			out.lastModified = ts;
			gDb.kset('kEmailMap', req.params.email, JSON.stringify(out));
			cb(0, out);
		}
	});
}

exports.check = function(req, res, cb)
{
	var out = new Object();
	
	gDb.kget('kEmailMap', req.params.email, function (error, value) {
		if(value!=null)
		{
			cb(0, JSON.parse(value));
			return;
		} else {
			cb(100)
		}
	});
}