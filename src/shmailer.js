var shlog = require(global.gBaseDir + "/src/shlog.js");
var mailer = require(global.gBaseDir + "/src/shmail.js");

var shmailer = exports;

shmailer.sendEmail = function (emailInfo, cb) {
  var locals = {
    email: emailInfo.email,
    subject: "Shelly Game Challenge",
    name: "pitty the fool",
    resetUrl: "http;//localhost:3000/password_rest/000000000001|afdaevdae353"
  };
  mailer.send("challenge", emailInfo, function (err, responseStatus, html, text) {
    if (err) {
      var errorInfo = {code: err.name, message: err.message, emailInfo: emailInfo};
      shlog.error(errorInfo);
      return cb(1, errorInfo);
    }
    return cb(0, {error: err, status: responseStatus});
  });
};

function sendLoop() {
  global.db.spop("jobs:email", function (err, data) {
    shlog.debug("mailer check:", err, data);
    if (err === null && data === null) {
      // no emails, wait and loop
      setTimeout(sendLoop, 5000);
      return;
    }

    var emailInfo = JSON.parse(data);
    shlog.info("sending:", emailInfo.email);
    shmailer.sendEmail(emailInfo, function (err, data) {
      shlog.info("sent:", err, data);
    });
    sendLoop();
  });
}

shmailer.queueEmail = function (emailInfo, cb) {
  global.db.sadd("jobs:email", JSON.stringify(emailInfo), cb);
};

shmailer.queueList = function (cb) {
  global.db.smembers("jobs:email", cb);
};

shmailer.start = function () {
  process.on("uncaughtException", function (error) {
    shlog.error("uncaughtException", error.stack);
    // restart the loop
    sendLoop();
  });

  shlog.info("starting mailer");
  sendLoop();
};