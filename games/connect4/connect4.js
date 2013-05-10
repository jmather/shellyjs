var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var connect4 = exports;

var COLUMN_FULL = -2;
var EMPTY = -1;
var YELLOW = 0;
var RED = 1;

connect4.create = function (req, res, cb) {
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


  res.add(sh.event("event.game.create", req.env.game.getData()));
  return cb(0);
};

connect4.reset = function (req, res, cb) {
  res.add(sh.event("event.game.reset", req.env.game.getData()));
  return cb(0);
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

connect4.turn = function (req, res, cb) {
  var uid = req.session.uid;
  var move = req.body.move;
  var game = req.env.game;
  var state = req.env.game.get("state");
  var board = state.board;

  if (board[move.x][move.y] !== EMPTY) {
    res.add(sh.error("move_bad", "this square has been taken"));
    return cb(1);
  }

  if (state.reds == uid) {
    board[move.x][move.y] = RED;
  } else {
    board[move.x][move.y] = YELLOW;
  }

  state.lastMove = {uid: uid, move: move, color: board[move.x][move.y]};
//  res.add(sh.event("event.game.turn", state.lastMove));
  global.socket.notify(game.get("oid"), sh.event("event.game.update", state.lastMove));


  var win = checkWin(board);
  if (win.winner != "") {
    game.set("status", "over");
    game.set("whoTurn", "0");
    state.winner = uid;
    state.winnerSet = win.set;
    game.set("state", state);
    res.add(sh.event("event.game.over", game.getData()));
    return cb(0);
  }

  if (checkFull(board)) {
    game.set("status", "over");
    game.set("whoTurn", "0");
    state.winner = "0";
    state.winnerSet = null;
    game.set("state", state);
    res.add(sh.event("event.game.over", game.getData()));
    return cb(0);
  }

  return cb(0);
}