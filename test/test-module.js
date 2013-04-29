var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");

/*global describe, before, it*/

var gEmail = "test@lgdales.com";
var gPassword = "foofoo";

describe("module module", function () {

  before(function (done) {
    st.init(gEmail, gPassword, function (err, res) {
      done();
    });
  });

  describe("CMD module.list", function () {
    it("list info for all core modules", function (done) {
      st.adminCall({cmd: "module.list"},
        function (err, res) {
          res.body.should.not.have.property("event", "error");
          done();
        });
    });
  });

  describe("CMD module.info", function () {
    it("info the named core modules", function (done) {
      st.adminCall({cmd: "module.info", name: "module"},
        function (err, res) {
          res.body.should.not.have.property("event", "error");
          done();
        });
    });
  });

});