var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var connect4 = exports;

var COLUMN_FULL = -2;
var EMPTY = -1;
var YELLOW = 0;
var RED = 1;

connect4.create = function (req, cb) {
  var board = [];
  for (var i = 0; i < 7; i++) {
    board[i] = []; //init board
    for(var j = 0; j < 6; j++) {
      board[i][j] = EMPTY; //set it to empty
    }
  }

  var state = {};
  state.board = board;
  // first player is always red
  state.reds = req.session.uid;
  state.winner = 0;
  state.winnerSet = null;

  req.env.game.set("minPlayers", 2);
  req.env.game.set("maxPlayers", 2);
  req.env.game.set("state", state);

  cb(0, sh.event("event.game.create", req.env.game.getData()));
};

connect4.reset = function (req, cb) {
  this.create(req, function (error, data) {
    if (error === 0) {
      data.event = "event.game.reset";
    }
    cb(error, data);
  });
};

function checkFull(gb) {
  for (var i = 0; i < 7; i++) {
    for (var j = 0; j < 6; j++) {
      if (gb[i][j] === EMPTY) {
        return false;
      }
    }
  }
  return true;
}

function checkWin(gb) {
  var res = {winner: "", set: null};

  return res;
}

connect4.turn = function (req, cb) {
  var uid = req.session.uid;
  var move = req.body.move;
  var game = req.env.game;
  var state = req.env.game.get("state");
  var board = state.board;

  if (board[move.x][move.y] !== EMPTY) {
    cb(2, sh.error("move_bad", "this square has been taken"));
    return;
  }

  if (state.reds == uid) {
    board[move.x][move.y] = RED;
  } else {
    board[move.x][move.y] = YELLOW;
  }

  state.lastMove = {uid: uid, move: move, color: board[move.x][move.y]};

  var win = checkWin(board);
  if (win.winner != "") {
    game.set("status", "over");
    game.set("whoTurn", "0");
    state.winner = uid;
    state.winnerSet = win.set;
    game.set("state", state);
    cb(0, sh.event("event.game.over", game.getData()));
    return;
  }

  if (checkFull(board)) {
    game.set("status", "over");
    game.set("whoTurn", "0");
    state.winner = "0";
    state.winnerSet = null;
    game.set("state", state);
    cb(0, sh.event("event.game.over", game.getData()));
    return;
  }

  game.set("state", state);
  cb(0, sh.event("event.game.turn", state.lastMove));
}