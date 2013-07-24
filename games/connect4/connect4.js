var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var channel = require(global.gBaseDir + "/functions/channel/channel.js");

var connect4 = exports;

var COLUMN_FULL = -2;
var EMPTY = -1;
var YELLOW = 0;
var RED = 1;

connect4.create = function (req, res, cb) {
  var board = [];
  var i, j;
  for (i = 0; i < 7; i += 1) {
    board[i] = []; //init board
    for (j = 0; j < 6; j += 1) {
      board[i][j] = EMPTY; //set it to empty
    }
  }

  var state = {};
  state.board = board;
  // first player is always red
  state.reds = req.session.uid;
  state.winner = "";
  state.winnerSet = null;

  req.env.game.set("minPlayers", 2);
  req.env.game.set("maxPlayers", 2);
  req.env.game.set("state", state);


  res.add(sh.event("game.create", req.env.game.getData()));
  return cb(0);
};

connect4.reset = function (req, res, cb) {
  var state = req.env.game.get("state");
  var i, j;
  for (i = 0; i < 7; i += 1) {
    state.board[i] = []; //init board
    for (j = 0; j < 6; j += 1) {
      state.board[i][j] = EMPTY; //set it to empty
    }
  }
  state.winner = "";
  state.winnerSet = null;

  res.add(sh.event("game.reset", req.env.game.getData()));
  return cb(0);
};

function checkFull(gb) {
  var i, j;
  for (i = 0; i < 7; i += 1) {
    for (j = 0; j < 6; j += 1) {
      if (gb[i][j] === EMPTY) {
        return false;
      }
    }
  }
  return true;
}

function checkVertical(board, turn, column, row, winSet) {
  if (row < 3) {
    return false;
  }
  var i;
  for (i = row; i > row - 4; i -= 1) {
    if (board[column][i] !== turn) {
      winSet.length = 0;
      return false;
    }
    winSet.push({x: column, y: i});
  }
  return true;
}

function checkHorizontal(board, turn, column, row, winSet) {
  var counter = 1;
  winSet.push({x: column, y: row});

  var i;
  for (i = column - 1; i >= 0; i -= 1) {
    if (board[i][row] !== turn) {
      break;
    }
    winSet.push({x: i, y: row});
    counter += 1;
  }

  var j;
  for (j = column + 1; j < 7; j += 1) {
    if (board[j][row] !== turn) {
      break;
    }
    winSet.push({x: j, y: row});
    counter += 1;
  }
  if (winSet.length < 4) {
    winSet.length = 0;
  }
  return counter >= 4;
}

function checkLeftDiagonal(board, turn, column, row, winSet) {
  var counter = 1;
  var tmp_row = row - 1;
  var tmp_column = column - 1;
  winSet.push({x: column, y: row});

  while (tmp_row >= 0 && tmp_column >= 0) {
    if (board[tmp_column][tmp_row] === turn) {
      winSet.push({x: tmp_column, y: tmp_row});
      counter += 1;
      tmp_row -= 1;
      tmp_column -= 1;
    } else {
      break;
    }
  }

  row += 1;
  column += 1;

  while (row < 6 && column < 7) {
    if (board[column][row] === turn) {
      winSet.push({x: column, y: row});
      counter += 1;
      row += 1;
      column += 1;
    } else {
      break;
    }
  }

  if (winSet.length < 4) {
    winSet.length = 0;
  }
  return counter >= 4;
}

function checkRightDiagonal(board, turn, column, row, winSet) {
  var counter = 1;
  var tmp_row = row + 1;
  var tmp_column = column - 1;
  winSet.push({x: column, y: row});

  while (tmp_row < 6 && tmp_column >= 0) {
    if (board[tmp_column][tmp_row] === turn) {
      winSet.push({x: tmp_column, y: tmp_row});
      counter += 1;
      tmp_row += 1;
      tmp_column -= 1;
    } else {
      break;
    }
  }

  row -= 1;
  column += 1;

  while (row >= 0 && column < 7) {
    if (board[column][row] === turn) {
      winSet.push({x: column, y: row});
      counter += 1;
      row -= 1;
      column += 1;
    } else {
      break;
    }
  }

  if (winSet.length < 4) {
    winSet.length = 0;
  }
  return counter >= 4;
}

function checkWin(board, turn, column, row, winSet) {

  if (checkVertical(board, turn, column, row, winSet)) { return true; }
  if (checkHorizontal(board, turn, column, row, winSet)) { return true; }
  if (checkLeftDiagonal(board, turn, column, row, winSet)) { return true; }
  if (checkRightDiagonal(board, turn, column, row, winSet)) { return true; }

  return false;
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

  var color = YELLOW;
  if (state.reds === uid) {
    color = RED;
  }
  board[move.x][move.y] = color;

  state.lastMove = {uid: uid, move: move, color: color};
  var event = sh.event("game.update", state.lastMove);
  res.add(event);
  channel.sendInt("game:" + game.get("oid"), event);

  var winSet = [];
  var win = checkWin(state.board, color, move.x, move.y, winSet);
  if (win) {
    game.set("status", "over");
    game.set("whoTurn", "");
    state.winner = uid;
    state.winnerSet = winSet;
    res.add(sh.event("game.over", game.getData()));
    return cb(0);
  }

  if (checkFull(board)) {
    game.set("status", "over");
    game.set("whoTurn", "");
    state.winner = "";
    state.winnerSet = null;
    res.add(sh.event("game.over", game.getData()));
    return cb(0);
  }

  return cb(0);
};