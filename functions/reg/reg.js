

exports.desc = "handles user login/logout and new user registration"
var gDefs = new Object();

gDefs.login = {
	desc: 'user login',
	params: {email: 'user email', password: 'user passwor'},
	returns: {id:'user id'},
	security: []
};
exports.login = function(req, res, cb)
{
	cb(null, {"reg.login":"foo foo foo"});
}

gDefs.logout = {
	desc: '',
	params: {},
	returns: {},
	security: []
};
exports.logout = function(req, res, cb)
{
	cb(null, {"reg.logout":"foo foo foo"});
}

gDefs.create = {
	desc: '',
	params: {},
	returns: {},
	security: []
};
exports.create = function(req, res, cb)
{
	cb(null, {"reg.create":"foo foo foo"});
}

exports.functions = gDefs;