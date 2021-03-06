var sh = require(global.C.BASE_DIR + "/lib/shutil.js");

var example = exports;

example.desc = "example api";
example.functions = {
  hello: {desc: "simple hello world api example", params: {}, security: []},
  echo: {desc: "one parameter api example", params: {param1: {dtype: "string"}}, security: []}
};

example.hello = function (req, res, cb) {
  res.add(sh.event("example.hello", "world"));
  return cb(0);
};

example.echo = function (req, res, cb) {
  res.add(sh.event("example.echo", req.body.param1));
  return cb(0);
};
