var _ = require('lodash');

var test = exports;

test.init = function(req, cb)
{
	req.env.game.state = {number:_.random(10)};
	cb(0, req.env.game)
}

test.turn = function(req, cb)
{
	if (req.params.guess == req.env.game.state.number)
	{
		cb(0, {message:"you won"});
	} else {
		cb(0, {message:"try again"});
	}
}
