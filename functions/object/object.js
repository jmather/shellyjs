var _ = require("lodash");
var crypto = require("crypto");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var object = exports;

object.desc = "generic object store";
object.functions = {
  create: {desc: "get object", params: {object: {dtype: "object"}}, security: []},
  delete: {desc: "remove object", params: {oid: {dtype: "string"}}, security: []},
  get: {desc: "get object", params: {oid: {dtype: "string"}}, security: []},
  set: {desc: "set object", params: {oid: {dtype: "string"}, object: {dtype: "object"}}, security: []}
};

object.create = function (req, res, cb) {
  shlog.info("object.create");

  var obj = req.loader.create("kObject", sh.uuid());
  obj.set(req.body.object);

  res.add(sh.event("object.create", obj.getData()));
  return cb(0);
};

object.delete = function (req, res, cb) {
  shlog.info("object.delete");

  req.loader.delete("kObject", req.body.oid, function (err, data) {
    if (err) {
      res.add(sh.error("delete-failed", "unable to delete object", data));
      return cb(1);
    }

    res.add(sh.event("object.delete", {status: "ok"}));
    return cb(0);
  });
};

object.get = function (req, res, cb) {
  req.loader.exists("kObject", req.body.oid, function (err, obj) {
    if (err) {
      res.add(sh.error("get-failed", "unable to get object", obj));
      return cb(1);
    }
    res.add(sh.event("object.get", obj.getData()));
    return cb(0);
  });
};

object.set = function (req, res, cb) {
  req.loader.get("kObject", req.body.oid, function (err, obj) {
    if (err) {
      res.add(sh.error("set-failed", "unable to load object to set", obj));
      return cb(1);
    }
    obj.setData(req.body.object);
    res.add(sh.event("object.set", obj.getData()));
    return cb(0);
  });
};