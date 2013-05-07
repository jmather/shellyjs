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

  cb(0, sh.event("object.get", obj.getData()));
};

object.delete = function (req, res, cb) {
  shlog.info("object.delete");

  req.loader.delete("kObject", req.body.oid, function (err, data) {
    if (err) {
      cb(err, sh.error("object_delete", "unable to delete object", {oid: req.body.oid, info: data}));
      return;
    }

    cb(0, sh.event("object.delete", {status: "ok"}));
  });
};

object.get = function (req, res, cb) {
  req.loader.exists("kObject", req.body.oid, function (err, obj) {
    if (err) {
      cb(err, sh.error("object_get", obj));
      return;
    }
    cb(0, sh.event("object.get", obj.getData()));
  });
};

object.set = function (req, res, cb) {
  req.loader.get("kObject", req.body.oid, function (err, obj) {
    if (err) {
      cb(err, obj);
      return;
    }
    obj.setData(req.body.object);
    cb(0, sh.event("object.set", obj.getData()));
  });
};