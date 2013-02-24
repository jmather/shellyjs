var _ = require('lodash');

var tictactoe = exports;

tictactoe.init = function(req, cb)
{
	gameBoard = [
							 ['','',''],
							 ['','',''],
							 ['','','']
							 ];
							
	req.env.game.state = {};
	req.env.game.state.gameBoard = gameBoard;  // SWD: change this to just board
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
	for (var i=0; i<3; i++) {
		for (var j=0; j<3; j++){
			if(gb[i][j] == '') {
				return false;
			}
		}
	}
	return res;
}

function checkWin(gb) {
	var res = {winner: '', set: null};
	
	console.log("checkWin");
	for (var i=0; i<3; i++) {
		if(gb[i][0] == gb[i][1] && gb[i][0] == gb[i][2]) {
			if(gb[i][1]!='') {
				res.winner = gb[i][1];
				return res;			
			}
		}
		if(gb[0][i] == gb[1][i] && gb[0][i] == gb[2][i]) {
			if(gb[1][i] != '') {
				res.winner = gb[1][i];
				return res;
			}
		}
	}
	if(gb[0,0]==gb[1,1] && gb[0,0]==gb[2,2]) {
		if(gb[1][1] != '') {
			res.winner = gb[1][1];
			return res;
		}
	}
	if(gb[0,2]==gb[1,1] && gb[0,2]==gb[2,0]) {
		if(gb[1][1] != '') {
			res.winner = gb[1][1];
			return res;
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