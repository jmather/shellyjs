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

tictactoe.turn = function(req, cb)
{
	var uid = req.session.uid;
	var move = req.params.move;
	var game = req.env.game;
	var gameBoard = game.state.gameBoard;
	
	if(gameBoard[move.x][move.y] != '') {
		cb(1, "this square has been taken");
		return;
	}
	
	if(game.state.xes == uid)
	{
		gameBoard[move.x][move.y] = "X";
	} else {
		gameBoard[move.x][move.y] = "Y";		
	}
	
	req.env.game.state.gameBoard = gameBoard;
	
	// check win
	
	cb(0, req.env.game)
}