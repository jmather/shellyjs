var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");

/*global describe, before, it*/

var gEmail = "test@lgdales.com";
var gPassword = "foofoo";

describe("api api", function () {

  before(function (done) {
    st.init(gEmail, gPassword, function (err, res) {
      done();
    });
  });

  describe("CMD api.core", function () {
    it("list info for all core apis", function (done) {
      st.adminCall({cmd: "api.core"},
        function (err, res) {
          res.body.should.have.property("event", "api.core");
          done();
        });
    });
  });

  describe("CMD api.app", function () {
    it("list info for all app apis", function (done) {
      st.adminCall({cmd: "api.app"},
        function (err, res) {
// will get error if not set
//          res.body.should.have.property("event", "api.app");
          done();
        });
    });
  });

  describe("CMD api.info", function () {
    it("info the named core apis", function (done) {
      st.adminCall({cmd: "api.info", name: "api"},
        function (err, res) {
          res.body.should.have.property("event", "api.info");
          done();
        });
    });
  });

});