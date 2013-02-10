
exports.take = function(req, res, cb)
{
	cb(null, {"turn.take":"foo foo foo"});
}

exports.status = function(req, res, cb)
{
	cb(null, {"turn.status":"foo foo foo"});
}
