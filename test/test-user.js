var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js")

var gEmail = "test@lgdales.com";
var gBadEmail = "bad@lgdales.com";
var gPassword = "foofoo";

describe('module user', function () {
  before(function (done) {
    st.init(gEmail, gPassword, function (err, res) {
      done();
    });
  });

  describe('CMD user.get', function () {
    it('respond with valid user', function (done) {
      st.userCall({cmd: "user.get"}, function (err, res) {
        res.body.should.not.have.property("event", "error");
        res.body.data.should.have.property("name");
        done();
      });
    });
  });

  describe('CMD user.set', function () {
    it('change user name with set', function (done) {
      var newName = "test-" + new Date().getTime();
      st.userCall({cmd: "user.set", user: {name: newName}}, function (err, res) {
        res.body.should.not.have.property("event", "error");
        res.body.data.should.have.property("name", newName);
        done();
      });
    });
  });

  describe('CMD user.find', function () {
    it("find user = " + gEmail, function (done) {
      st.adminCall({cmd: "user.find", by: "email", value: gEmail}, function (err, res) {
        res.body.should.not.have.property("event", "error");
        res.body.data.should.have.property("email", gEmail);
        done();
      });
    });
    it("don't find user = " + gBadEmail, function (done) {
      st.adminCall({cmd: "user.find", by: "email", value: gBadEmail}, function (err, res) {
        res.body.should.have.property("event", "error");
        done();
      });
    });
  });

});
