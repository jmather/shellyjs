var _ = require('lodash');

var shutil = require(global.gBaseDir + '/src/shutil.js');

var tictactoe = exports;

tictactoe.create = function(req, cb)
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
	req.env.game.state.winner = 0;
	req.env.game.state.winnerSet = null;
	req.env.game.state.xes = req.session.uid;
	
	
	cb(0, shutil.event("event.game.info", req.env.game));
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
			if(gb[i][0]!='') {
				res.winner = gb[i][0];
				res.set = ['x'+i+'y0', 'x'+i+'y1', 'x'+i+'y2'];
				return res;			
			}
		}
		if(gb[0][i] == gb[1][i] && gb[0][i] == gb[2][i]) {
			if(gb[0][i] != '') {
				res.winner = gb[0][i];
				res.set = ['x0y'+i, 'x1y'+i, 'x2y'+i];
				return res;
			}
		}
	}
	
	if(gb[0][0]==gb[1][1] && gb[0][0]==gb[2][2]) {
		if(gb[1][1] != '') {
			res.winner = gb[1][1];
			res.set = ['x0y0', 'x1y1', 'x2y2'];			
			return res;
		}
	}
	if(gb[0][2]==gb[1][1] && gb[0][2]==gb[2][0]) {
		if(gb[1][1] != '') {
			res.winner = gb[1][1];
			res.set = ['x0y2', 'x1y1', 'x2y0'];			
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

	if(Object.keys(game.players).length < 2) {
		cb(2, shutil.error("players_missing", "not enough players in game", {required: 2, playerCount: Object.keys(game.players).length}));
		return;
	}
	
	if(gameBoard[move.x][move.y] != '') {
		cb(2, shutil.error("move_bad", "this square has been taken"));
		return;
	}
	
	if(game.state.xes == uid)
	{
		gameBoard[move.x][move.y] = "X";
	} else {
		gameBoard[move.x][move.y] = "O";		
	}
	
	var win = checkWin(gameBoard);
	if(win.winner != '') {
		game.status = "over";
		game.whoTurn = 0;
		game.state.winner = uid;
		game.state.winnerSet = win.set;
		cb(0, shutil.event('event.game.over', game));
		return;
	}
	
	if(checkFull(gameBoard)) {
		game.status = "over";
		game.whoTurn = 0;
		game.state.winner = 0;
		game.state.winnerSet = null;		
		cb(0, shutil.event('event.game.over', game));
		return;
	}
	
	cb(0, shutil.event('event.game.info', game));
}