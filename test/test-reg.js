var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");

/*global describe, before, it*/

var gEmail = "test@lgdales.com";
var gEmailUpgrade = "testUpgrade@lgdales.com";
var gPassword = "foofoo";
var gToken = "00000000-0000-0000-0000-000000000000";
var gAnonymousSession = "";

describe("module reg", function () {

  before(function (done) {
    st.init(gEmail, gPassword, function (err, res) {
      done();
    });
  });

  describe("CMD reg.remove", function () {
    it("respond with no error", function (done) {
      st.adminCall({cmd: "reg.remove", email: gEmail},
        function (err, res) {
          res.body.should.have.property("event", "reg.remove");
          done();
        });
    });
  });

  describe("CMD reg.create", function () {
    it("invalid email, no session", function (done) {
      st.call({cmd: "reg.create", email: "bad", password: gPassword},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });
    it("invalid password, no session", function (done) {
      st.call({cmd: "reg.create", email: gEmail, password: "short"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });
    it("respond with valid session", function (done) {
      st.call({cmd: "reg.create", email: gEmail, password: gPassword},
        function (err, res) {
          res.body.should.have.property("event", "reg.create");
          res.body.data.should.have.property("session");
          done();
        });
    });
  });

  describe("CMD reg.aconfirm", function () {
    it("bad confirm, good password, valid session", function (done) {
      st.call({cmd: "reg.login", email: gEmail, password: gPassword},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });
    it("admin confirm", function (done) {
      st.adminCall({cmd: "reg.aconfirm", email: gEmail},
        function (err, res) {
          res.body.should.have.property("event", "reg.aconfirm");
          done();
        });
    });
  });

  describe("CMD reg.login", function () {
    it("good password, valid session", function (done) {
      st.call({cmd: "reg.login", email: gEmail, password: gPassword},
        function (err, res) {
          res.body.should.have.property("event", "reg.login");
          res.body.data.should.have.property("session");
          done();
        });
    });
    it("bad user, no session", function (done) {
      st.call({cmd: "reg.login", email: "bad@lgdales.com", password: gPassword},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });
    it("bad password, no session", function (done) {
      st.call({cmd: "reg.login", email: gEmail, password: "bad"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });
  });

  describe("CMD reg.anonymous", function () {

    before(function (done) {
      // clear any upgrade
      st.adminCall({cmd: "reg.remove", email: gEmailUpgrade},
        function (err, res) {
          res.body.should.have.property("event", "reg.remove");
          done();
        });
    });

    it("good token, valid session", function (done) {
      st.call({cmd: "reg.anonymous", token: gToken},
        function (err, res) {
          res.body.should.have.property("event", "reg.anonymous");
          res.body.data.should.have.property("session");
          done();
        });
    });

    it("bad short token, valid session", function (done) {
      st.call({cmd: "reg.anonymous", token: "short"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });
  });

  describe("CMD reg.upgrade", function () {

    before(function (done) {
      st.adminCall({cmd: "reg.remove", email: gEmailUpgrade},
        function (err, res) {
          res.body.should.have.property("event", "reg.remove");
          st.call({cmd: "reg.anonymous", token: gToken},
            function (err, res) {
              res.body.should.have.property("event", "reg.anonymous");
              res.body.data.should.have.property("session");
              gAnonymousSession = res.body.data.session;
              done();
            });
        });
    });

    it("invalid token, no session", function (done) {
      st.call({cmd: "reg.upgrade", token: "bad", password: gPassword},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });

    it("invalid password, no session", function (done) {
      st.call({cmd: "reg.upgrade", token: gToken, password: "short"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });

    it("respond with user", function (done) {
      st.call({cmd: "reg.upgrade", session: gAnonymousSession, email: gEmailUpgrade, password: gPassword},
        function (err, res) {
          res.body.should.have.property("event", "reg.upgrade");
          res.body.data.should.have.property("email", gEmailUpgrade);
          done();
        });
    });

  });

});