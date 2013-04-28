var request = require("supertest");
var should = require("should");
var _ = require("lodash");

request = request("http://localhost:5101");
var gData = {session: "1:33:xxxx:0"};
var gEmail = "test@lgdales.com";
var gEmailUpgrade = "testUpgrade@lgdales.com";
var gPassword = "foofoo";
var gToken = "00000000-0000-0000-0000-000000000000";

function testCall(data, cb) {
  var req = _.clone(gData);
  _.merge(req, data);
  request.post("/api").send(req)
    .set("Accept", "application/json")
    .expect(200)
    .end(function (err, res) {
      should.not.exist(err);
      cb(err, res);
    });
}

describe("module reg", function () {

  before(function () {
  });

  describe("CMD reg.remove", function () {
    it("respond with no error", function (done) {
      testCall({cmd: "reg.remove", email: gEmail},
        function (err, res) {
          res.body.should.not.have.property("event", "error");
          done();
        });
    });
  });

  describe("CMD reg.create", function () {
    it("invalid email, no session", function (done) {
      testCall({cmd: "reg.create", email: "bad", password: gPassword},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });
    it("invalid password, no session", function (done) {
      testCall({cmd: "reg.create", email: gEmail, password: "short"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });
    it("respond with valid session", function (done) {
      testCall({cmd: "reg.create", email: gEmail, password: gPassword},
        function (err, res) {
          res.body.should.have.property("event", "reg.create");
          res.body.data.should.have.property("session");
          done();
        });
    });
  });

  describe("CMD reg.login", function () {
    it("good password, valid session", function (done) {
      testCall({cmd: "reg.login", email: gEmail, password: gPassword},
        function (err, res) {
          res.body.should.have.property("event", "reg.login");
          res.body.data.should.have.property("session");
          done();
        });
    });
    it("bad user, no session", function (done) {
      testCall({cmd: "reg.login", email: "bad@lgdales.com", password: gPassword},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });
    it("bad password, no session", function (done) {
      testCall({cmd: "reg.login", email: gEmail, password: "bad"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });
  });

  describe("CMD reg.anonymous", function () {
    it("good token, valid session", function (done) {
      testCall({cmd: "reg.anonymous", token: gToken},
        function (err, res) {
          res.body.should.have.property("event", "reg.anonymous");
          res.body.data.should.have.property("session");
          done();
        });
    });
    it("bad short token, valid session", function (done) {
      testCall({cmd: "reg.anonymous", token: "short"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });
  });

  describe("CMD reg.upgrade", function () {
    
    before(function () {
      testCall({cmd: "reg.remove", email: gEmailUpgrade},
        function (err, res) {
          res.body.should.have.property("event", "reg.remove");
        });
    });

    it("invalid token, no session", function (done) {
      testCall({cmd: "reg.upgrade", token: "bad", password: gPassword},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });
    it("invalid password, no session", function (done) {
      testCall({cmd: "reg.upgrade", token: gToken, password: "short"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.data.should.not.have.property("session");
          done();
        });
    });
    it("respond with valid session", function (done) {
      testCall({cmd: "reg.upgrade", token: gToken, email: gEmailUpgrade, password: gPassword},
        function (err, res) {
          res.body.should.have.property("event", "reg.upgrade");
          res.body.data.should.have.property("email", gEmailUpgrade);
          done();
        });
    });
  });


});