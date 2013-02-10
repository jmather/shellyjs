
var test = "reg";

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
	cb(null, {"reg.create":"foo foo foo"});
}
