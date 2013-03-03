var _ = require('lodash');
var crypto = require('crypto');

var shlog = require(global.gBaseDir + '/src/shlog.js');
var sh = require(global.gBaseDir + '/src/shutil.js');

var db = global.db;

var object = exports;

object.desc = "generic object store";
object.functions = {
  create: {desc: 'get object', params: {className: {dtype: 'string'}, object: {dtype: 'object'}}, security: []},
  destroy: {desc: 'get object', params: {oid: {dtype: 'string'}}, security: []},
  get: {desc: 'get object', params: {className: {dtype: 'string'}, oid: {dtype: 'string'}}, security: []},
  set: {desc: 'set object', params: {className: {dtype: 'string'}, oid: {dtype: 'string'}, object: {dtype: 'object'}}, security: []}
};

object.pre = function (req, res, cb) {
  shlog.info('object.pre');
  var cmd = req.params.cmd;
  var className = req.params.className;
  var oid = req.params.oid;

  if (cmd === 'object.create') {
    cb(0);
    return;
  }

  // SWD - eventually check security session.uid has rights to object

  req.env.object = null;
  db.kget('kObject', [className, oid], function (err, value) {
    if (value === null) {
      cb(1, sh.error("object_get", "unable to get object", {className: className, oid: oid}));
      return;
    }
    req.env.object = JSON.parse(value);
    cb(0);
  });
};

object.post = function (req, res, cb) {
  shlog.info('object.post');
  var object = req.env.object;

  if (req.env.object === null) {
    cb(1, sh.error("object_null", "object is not valid to save"));
    return;
  }

  // get the hash by removing the info, re-hashing, and replacing info
  var info = object._info;
  delete object._info;
  var newHash = crypto.createHash('md5').update(JSON.stringify(object)).digest("hex");
  object._info = info;

  if (newHash !== info.hash) {
    shlog.info("object modified - saving");
    object._info.hash = newHash;
    req.env.object._info.lastModified = new Date().getTime();
    var objectStr = JSON.stringify(object);
    db.kset('kObject', [object._info.className, object._info.oid], objectStr, function (err, res) {
      if (err !== null) {
        cb(1, sh.error("object_save", "unable to save object", {err: err.toString(), res: res}));
        return;
      }
      cb(0);
    });
  } else {
    cb(0);
  }
};

object.create = function (req, res, cb) {
  shlog.info('object.create');
  var className = req.params.className;

  var object = {};
  db.nextId('object-' + className, function (error, value) {
    // create the object
    var ts = new Date().getTime();
    object._info = {
      oid: value.toString(),
      className: className,
      created: ts,
      lastModified: ts,
      hash: ''
    };
    object = _.merge(object, req.params.object);

    req.env.object = object;
    cb(0, object);
  });
};

object.destroy = function (req, res, cb) {
  shlog.info('object.destroy');
  cb(0);
};

object.get = function (req, res, cb) {
  cb(0, req.env.object);
};

object.set = function (req, res, cb) {
  var object = req.env.object;
  var newObject = req.params.object;

  if (!_.isUndefined(newObject._info)) {
    delete newObject._info; // never merge the info block;
  }

  req.env.object = _.merge(object, newObject);

  cb(0, req.env.object);
};