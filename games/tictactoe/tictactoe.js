var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var channel = require(global.gBaseDir + "/functions/channel/channel.js");

var tictactoe = exports;

var gDefaultBoard = [
  ["", "", ""],
  ["", "", ""],
  ["", "", ""]
];

tictactoe.create = function (req, res, cb) {
  req.env.game.set("minPlayers", 2);
  req.env.game.set("maxPlayers", 2);

  var state = {};
  state.gameBoard = _.clone(gDefaultBoard);
  // first player is always X
  state.xes = req.session.uid;
  state.winner = 0;
  state.winnerSet = null;
  state.xes = req.session.uid;
  req.env.game.set("state", state);

  res.add(sh.event("game.create", req.env.game.getData()));
  return cb(0);
};

tictactoe.reset = function (req, res, cb) {
  var state = req.env.game.get("state");
  state.gameBoard = _.clone(gDefaultBoard);
  state.winner = 0;
  state.winnerSet = null;
  state.xes = req.session.uid;

  res.add(sh.event("game.info", req.env.game.getData()));
  return cb(0);
};

function checkFull(gb) {
  var res = true;
  var i, j;
  for (i = 0; i < 3; i += 1) {
    for (j = 0; j < 3; j += 1) {
      if (gb[i][j] === "") {
        return false;
      }
    }
  }
  return res;
}

function checkWin(gb) {
  var res = {winner: "", set: null};

  shlog.log("checkWin");
  var i;
  for (i = 0; i < 3; i += 1) {
    if (gb[i][0] === gb[i][1] && gb[i][0] === gb[i][2]) {
      if (gb[i][0] !== "") {
        res.winner = gb[i][0];
        res.set = ["x" + i + "y0", "x" + i + "y1", "x" + i + "y2"];
        return res;
      }
    }
    if (gb[0][i] === gb[1][i] && gb[0][i] === gb[2][i]) {
      if (gb[0][i] !== "") {
        res.winner = gb[0][i];
        res.set = ["x0y" + i, "x1y" + i, "x2y" + i];
        return res;
      }
    }
  }

  if (gb[0][0] === gb[1][1] && gb[0][0] === gb[2][2]) {
    if (gb[1][1] !== "") {
      res.winner = gb[1][1];
      res.set = ["x0y0", "x1y1", "x2y2"];
      return res;
    }
  }
  if (gb[0][2] === gb[1][1] && gb[0][2] === gb[2][0]) {
    if (gb[1][1] !== "") {
      res.winner = gb[1][1];
      res.set = ["x0y2", "x1y1", "x2y0"];
      return res;
    }
  }
  return res;
}

tictactoe.turn = function (req, res, cb) {
  var uid = req.session.uid;
  var move = req.body.move;
  var game = req.env.game;
  var state = req.env.game.get("state");
  var gameBoard = state.gameBoard;

  if (gameBoard[move.x][move.y] !== "") {
    res.add(sh.error("move_bad", "this square has been taken"));
    return cb(1);
  }

  if (state.xes === uid) {
    gameBoard[move.x][move.y] = "X";
  } else {
    gameBoard[move.x][move.y] = "O";
  }
  state.lastMove = {uid: uid, move: move, color: gameBoard[move.x][move.y]};
  channel.sendInt("game:" + game.get("oid"), sh.event("game.info", game.getData()));

  var win = checkWin(gameBoard);
  if (win.winner !== "") {
    game.set("status", "over");
    game.set("whoTurn", "");
    state.winner = uid;
    state.winnerSet = win.set;
    game.set("state", state);
    res.add(sh.event("game.over", game.getData()));
    return cb(0);
  }

  if (checkFull(gameBoard)) {
    game.set("status", "over");
    game.set("whoTurn", "");
    state.winner = "";
    state.winnerSet = null;
    game.set("state", state);
    res.add(sh.event("game.over", game.getData()));
    return cb(0);
  }

  // send back the updated board
  res.add(sh.event("game.info", game.getData()));
  return cb(0);
};