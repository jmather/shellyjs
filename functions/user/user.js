var _ = require('lodash');

var shlog = require(global.gBaseDir + '/src/shlog.js');
var sh = require(global.gBaseDir + '/src/shutil.js');

var db = global.db;

var user = exports;

user.desc = "utility functions for shelly modules";
user.functions = {
  get: {desc: 'get user object', params: {uid: {dtype: 'string'}}, security: []},
  set: {desc: 'set user object', params: {uid: {dtype: 'string'}, user: {dtype: 'object'}}, security: []},
  games: {desc: 'list games user is playing', params: {}, security: []},
  gameRemove: {desc: 'remove a game from the playing list', params: {gameId: {dtype: 'string'}}, security: []}
};

user.pre = function (req, res, cb) {
  shlog.info('user.pre');
  // user is always preloaded now in session check

  // SWD - eventually check security session.uid has rights to params.uid
  cb(0);
};

user.post = function (req, res, cb) {
  shlog.info('user.post');
  // SWD: work out pre/post user save later, for now save on every set
  cb(0);
};

user.get = function (req, res, cb) {
  shlog.info(req.env.user);
  cb(0, req.session.user.getData());
};

user.set = function (req, res, cb) {
  var newUser = req.params.user;

  req.session.user.setData(newUser);

  cb(0, req.session.user.getData());
};

user.games = function (req, res, cb) {
  cb(0, sh.event("event.user.games", req.session.user.get('currentGames')));
};

user.gameRemove = function (req, res, cb) {
  var gameId = req.params.gameId;
  var user = req.session.user;
  var currentGames = user.get('currentGames');
  delete currentGames[gameId];
  user.set(currentGames);

  cb(0, sh.event("event.user.games", currentGames));
};