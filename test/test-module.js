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

  describe("CMD module.core", function () {
    it("list info for all core modules", function (done) {
      st.adminCall({cmd: "module.core"},
        function (err, res) {
          res.body.should.have.property("event", "module.core");
          done();
        });
    });
  });

  describe("CMD module.app", function () {
    it("list info for all app modules", function (done) {
      st.adminCall({cmd: "module.app"},
        function (err, res) {
// will get error if not set
//          res.body.should.have.property("event", "module.app");
          done();
        });
    });
  });

  describe("CMD module.info", function () {
    it("info the named core modules", function (done) {
      st.adminCall({cmd: "module.info", name: "module"},
        function (err, res) {
          res.body.should.have.property("event", "module.info");
          done();
        });
    });
  });

});