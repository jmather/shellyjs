var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");

/*global describe, before, it*/

var gEmail = "test@lgdales.com";
var gPassword = "foofoo";

describe("module system", function () {

  before(function (done) {
    st.init(gEmail, gPassword, function (err, res) {
      done();
    });
  });

  describe("CMD system.config", function () {
    it("get server config data", function (done) {
      st.adminCall({cmd: "system.config"},
        function (err, res) {
          res.body.should.have.property("event", "system.config");
          done();
        });
    });
  });

  describe("CMD system.stats", function () {
    it("get server statistics data", function (done) {
      st.adminCall({cmd: "system.stats"},
        function (err, res) {
          res.body.should.have.property("event", "system.stats");
          done();
        });
    });
  });

});