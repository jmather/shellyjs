var request = require('superagent');
var _ = require('lodash');
var async = require('async');

var host = "http://localhost:5101";

console.log("go");

var reqTpl1 = {session: '1:33:xxxx:0', gameId: "193"}
var reqTpl2 = {session: '1:44:xxxx:0', gameId: "193"}

var gMoveDelay = 100;

var gRuns = 10000;
var gMoveSet = [
						 [0,0], [0,1], [0,2],
						 [1,0], [1,1], [1,2],
						 [2,0], [2,1], [2,2],
						 ]
var gMoves = _.clone(gMoveSet);
var gStats = {'33':0, '44':0, '0': 0};

var gRunCount = 0;
run();
function run()
{
	console.log("------------", gRunCount);
	async.waterfall([
    function(cb){reset(cb);},
    function(cb){join(cb);},
    function(cb){moveUntilEnd(reqTpl1, gMoves, cb);},
	], function (err, result) {
		gMoves = _.clone(gMoveSet);

		gRunCount++;
		if (gRunCount < gRuns) {
			run();
		} else {
			console.log('');
			console.log("stats", gStats);
		}
	});
}

function reset(cb)
{
	var reqData = _.clone(reqTpl1);
	reqData.cmd = 'game.reset';
	request.post(host+'/api')
	  .send(reqData)
	  .set('Accept', 'application/json')
	  .end(function(res){
//			console.log("reset done");
//			console.log(res.body);
			cb();
	  });
}

function join(cb)
{
	var reqData = _.clone(reqTpl1);
	reqData.cmd = 'game.join';
	request.post(host+'/api')
	  .send(reqData)
	  .set('Accept', 'application/json')
	  .end(function(res){
//			console.log("join done");
//			console.log(res.body);
			cb();
	  });
}


function moveUntilEnd(tpl, moves, cb) {
	var idx = _.random(moves.length-1);
	var newMove = moves.splice(idx, 1);
	move2(tpl, newMove[0][0], newMove[0][1], function(res) {
		// if win stop
		if(res.event == "event.game.over") {
			gStats[res.data.state.winner] += 1;
			cb();
			return;
		}
		var tpl = (res.data.whoTurn=="44" ? reqTpl2 : reqTpl1 );
		moveUntilEnd(tpl, moves, cb);
	});
}

function move2(tpl, x, y, cb)
{
	console.log("move:", x, y);
	var reqData = _.clone(tpl);
	reqData.cmd = 'game.turn';
	reqData.move = {x:x, y:y}
	request.post(host+'/api')
	  .send(reqData)
	  .set('Accept', 'application/json')
	  .end(function(res){
			if(gMoveDelay == 0 ) {
				cb(res.body);
			} else {
				setTimeout(function() {cb(res.body)}, gMoveDelay);
			}
	  });
}