var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var _w = require(global.gBaseDir + "/src/shcb.js")._w;
var mailer = require(global.gBaseDir + "/src/shmail.js");

var shmailer = exports;

shmailer.sendEmail = function (emailInfo, cb) {

  var baseInfo = {
    timeQueued: 0,
    timeSent: new Date().getTime(),
    retries: 0
  };
  _.assign(baseInfo, emailInfo);
  mailer.send(baseInfo.template, baseInfo, _w(cb, function (err, responseStatus, html, text) {
    if (err) {
      var errorMsg = sh.intMsg(err.code, err.message);
      shlog.error("shmailer", errorMsg);
      return cb(1, errorMsg);
    }
    return cb(0, {error: err, status: responseStatus});
  }));
};

/*global sendLoop */
function sendError(err, data) {
  setTimeout(sendLoop, 5000);
}

function sendLoop() {
  global.db.spop("jobs:email", _w(sendError, function (err, data) {
    shlog.debug("shmailer", "mailer check:", err, data);
    if (!err && data === null) {
      // no emails, wait and loop
      setTimeout(sendLoop, 5000);
      return;
    }

    var emailInfo = JSON.parse(data);
    shlog.info("shmailer", "sending:", emailInfo.email, emailInfo.template);
    shmailer.sendEmail(emailInfo, _w(sendError, function (err, data) {
      if (err) {
        // add back to set
        emailInfo.retries += 1;
        global.db.sadd("jobs:email", JSON.stringify(emailInfo), function (err, data) {
          // ignore for now
        });
      }
      shlog.info("shmailer", "sent:", err, data);
    }));
    sendLoop();
  }));
}

shmailer.queueEmail = function (emailInfo, cb) {
  emailInfo.timeQueued = new Date().getTime();
  emailInfo.retries = 0;
  global.db.sadd("jobs:email", JSON.stringify(emailInfo), cb);
};

shmailer.queueList = function (cb) {
  global.db.smembers("jobs:email", cb);
};

shmailer.start = function () {
  shlog.system("shmailer", "started");
  process.on("uncaughtException", function (error) {
    shlog.error("shmailer", "uncaughtException", error.stack);
    // restart the loop
    sendLoop();
  });

  shlog.info("shmailer", "starting mailer");
  sendLoop();
};

shmailer.shutdown = function (cb) {
  shlog.info("shmailer", "shutdown mailer");
  cb(0);
};