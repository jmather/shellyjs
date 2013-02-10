
var test = "reg";

exports.get = function(req, res, cb)
{
	global.db.get(req.params.id, function(err, value){
		cb(err, JSON.parse(value));
	});
}