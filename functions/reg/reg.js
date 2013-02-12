

exports.desc = "handles user login/logout and new user registration"
var gDefs = new Object();

gDefs.login = {
	desc: 'user login',
	params: {email: {dtype:"string"}, password: {dtype:'string'}},
	security: []
};
exports.login = function(req, res, cb)
{
	cb(null, {"reg.login":"foo foo foo"});
}

gDefs.logout = {
	desc: '',
	params: {},
	security: []
};
exports.logout = function(req, res, cb)
{
	cb(null, {"reg.logout":"foo foo foo"});
}

gDefs.create = {
	desc: '',
	params: {},
	security: []
};
exports.create = function(req, res, cb)
{
	cb(null, {"reg.create":"foo foo foo"});
}

exports.functions = gDefs;