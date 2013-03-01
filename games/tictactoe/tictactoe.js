var _ = require('lodash');

var shlog = require(global.gBaseDir + '/src/shlog.js');
var sh = require(global.gBaseDir + '/src/shutil.js');

var tictactoe = exports;

tictactoe.create = function(req, cb)
{
	gameBoard = [
		['','',''],
		['','',''],
		['','','']
	];
							
	var state = {};
	state.gameBoard = gameBoard;  // SWD: change this to just board
	// first player is always X
	state.xes = req.session.uid;
	state.winner = 0;
	state.winnerSet = null;
	state.xes = req.session.uid;
	
	req.env.game.set("maxPlayers", 2);
	req.env.game.set("state", state);
	
	cb(0, sh.event("event.game.info", req.env.game.getData()));
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
	
	shlog.log("checkWin");
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
	var state = req.env.game.get("state");
	var gameBoard = state.gameBoard;

	if(Object.keys(game.get("players")).length < 2) {
		cb(2, sh.error("players_missing", "not enough players in game", {required: 2, playerCount: Object.keys(game.get("players")).length}));
		return;
	}
	
	if(gameBoard[move.x][move.y] != '') {
		cb(2, sh.error("move_bad", "this square has been taken"));
		return;
	}
	
	if(state.xes == uid)
	{
		gameBoard[move.x][move.y] = "X";
	} else {
		gameBoard[move.x][move.y] = "O";		
	}
	
	var win = checkWin(gameBoard);
	if(win.winner != '') {
		game.set("status", "over");
		game.set("whoTurn", '0');
		state.winner = uid;
		state.winnerSet = win.set;
		game.set("state", state);
		cb(0, sh.event('event.game.over', game.getData()));
		return;
	}
	
	if(checkFull(gameBoard)) {
		game.set("status", "over");
		game.set("whoTurn", '0');
		state.winner = '0';
		state.winnerSet = null;		
		game.set("state", state);
		cb(0, sh.event('event.game.over', game.getData()));
		return;
	}
	
	game.set("state", state);
	cb(0, sh.event('event.game.info', game.getData()));
}