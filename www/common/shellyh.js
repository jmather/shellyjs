
function Shelly(restUrl) {
  this.restUrl = restUrl;
  this.token = "";
  this.errorFunc = function (err) {
    console.log(err);
  };
}

Shelly.prototype.checkToken = function (newToken) {
  this.token = $.cookie("shToken");
  if (typeof (this.token) === "undefined") {
    this.setToken(newToken);
  }
};

Shelly.prototype.setToken = function (newToken) {
  this.token = newToken;
  $.cookie("shToken", this.token, { expires: 3650, path: "/" });
};

Shelly.prototype.login = function (email, password, role, cb) {
  var data = {cmd: "reg.login",
    email: email,
    password: password,
    role: role
  };

  this.call(data, function (res, status) {
    if (res[0].event === "reg.login") {
      $.cookie("shSession", res[0].data.session, {path: "/", expires: 365});
    }
    cb(res, status);
  });
};

Shelly.prototype.call = function (data, cb) {
  $.ajax ({
    type: "POST",
    url: Env.restUrl,
    async: false,
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(data),
    success: cb,
    error: function (xhr, status, err) {
      cb(1, err);
    }
  });
};

var shelly = new Shelly();