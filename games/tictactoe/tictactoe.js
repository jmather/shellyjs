var _ = require('lodash');

var tictactoe = exports;

tictactoe.init = function(req, cb)
{
	gameBoard = {x1:{y1:'', y2:'', y3:''},
								x2:{y1:'', y2:'', y3:''},
								x3:{y1:'', y2:'', y3:''}
							};
							
	req.env.game.state = {};
	req.env.game.state.gameBoard = gameBoard;
	// first player is always X
	req.env.game.state.xes = req.session.uid;
	cb(0, req.env.game)
}

tictactoe.join = function(req, cb)
{
	// make sure user is not already in game - game.js should do this
	// second player is always O
	req.env.game.state.oes = req.session.uid;
}

function checkFull(gb) {
	var res = true;
	for (var i=1; i<4; i++) {
		for (var j=0; j<4; j++){
			if(gb["x"+i]["y"+j] == '') {
				return false;
			}
		}
	}
	return res;
}

function checkWin(gb) {
	var res = {winner: '', set: null};
	
	console.log("checkWin");
	for (var i=1; i<4; i++) {
		console.log(i);
		if(gb["x"+i]["y1"] == gb["x"+i]["y2"] && gb["x"+i]["y1"] == gb["x"+i]["y3"]) {
			if(gb["x"+i]["y1"]!='') {
				res.winner = gb["x"+1]["y1"];
				return res;			
			}
		}
		if(gb["x1"]["y"+i] == gb["x2"]["y"+i] && gb["x1"]["y"+i] == gb["x3"]["y"+i]) {
			if(gb["x1"]["y"+i] != '') {
				res.winner = gb["x1"]["y"+i];
				return res;
			}
		}
	}
	return res;
}

tictactoe.turn = function(req, cb)
{
	var uid = req.session.uid;
	var move = req.params.move;
	var game = req.env.game;
	var gameBoard = game.state.gameBoard;
		
	if(gameBoard[move.x][move.y] != '') {
		cb(200, {info: "this square has been taken"});
		return;
	}
	
	if(game.state.xes == uid)
	{
		gameBoard[move.x][move.y] = "X";
	} else {
		gameBoard[move.x][move.y] = "Y";		
	}
	
	var win = checkWin(gameBoard);
	if(win.winner != '') {
		game.status = "over";
		game.winner = uid;
		var data = {event: "evt.game.over", winner: win.winner, game: game};
		cb(0, data);
		return;
	}
	
	if(checkFull(gameBoard)) {
		game.status = "over";
		game.winner = 0;
		var data = {event: "evt.game.over", game: game};
		cb(0, data);
		return;
	}
	
	cb(0, game)
}