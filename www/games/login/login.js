
function setToken(token) {
  Env.shToken = token;
  $.cookie("shToken", Env.shToken, { expires: 3650, path: "/" });
}

function doLogin() {
  hideAllMessages();

  var data = {cmd: "reg.login",
    email: $("#email").val(),
    password: $("#pass").val()
  }
  console.log(data);

  $.ajax ({
    type: "POST",
    url: Env.restUrl,
    async: false,
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(data),
    success: function (res, status) {
      if (res[0].event === "reg.login") {
        $.cookie("shSession", res[0].data.session, {path: "/", expires: 365});
        console.log("all good", res[0].data.session);
        window.location.href = "/index.html";
      } else {
        error(res[0].message);
      }
    },
    error: function (xhr, status, err) {
      error(err);
    }
  })
}

function doRegister() {
  hideAllMessages();

  if ($("#pass").val() !== $("#passVerify").val()) {
    error("password do not match");
    return;
  }

  var data = {cmd: "reg.create",
    email: $("#email").val(),
    password: $("#pass").val()
  }

  $.ajax ({
    type: "POST",
    url: Env.restUrl,
    async: false,
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(data),
    success: function (res, status) {
      if (res[0].event === "reg.create") {
        $.cookie("shSession", res[0].data.session, {path: "/", expires: 365});
        window.location.href = "/index.html";
      } else {
        error(res[0].message);
      }
    },
    error: function (xhr, status, err) {
      error(err);
    }
  })
}

function doAnonymous() {
  hideAllMessages();

  var data = {cmd: "reg.anonymous",
    token: Env.shToken
  }
  console.log(data);

  $.ajax ({
    type: "POST",
    url: Env.restUrl,
    async: false,
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(data),
    success: function (res, status) {
      if (res[0].event === "reg.anonymous") {
        $.cookie("shSession", res[0].data.session, {path: "/", expires: 365});
        window.location.href = "/index.html";
      } else {
        if (res[0].code === "user-upgraded") {
          $("#upgradeDiv").css("display", "block");
        } else {
          error(res[0].message);
        }
      }
    },
    error: function (xhr, status, err) {
      error(err);
    }
  })
}

function registerMode()
{
  $("#shSubTitle").text("Register");
	hideAllMessages();
  $(".loginConfig").css("display", "none");
  $(".login-inline").css("display", "none");
  $(".registerConfig").css("display", "block");
  $(".register-inline").css("display", "inline");
  $(".registerRow").css("display", "");
}

function loginMode()
{
  $("#shSubTitle").text("Login");
	hideAllMessages();
  $(".loginConfig").css("display", "block");
  $(".login-inline").css("display", "inline");
  $(".registerConfig").css("display", "none");
  $(".register-inline").css("display", "none");
  $(".registerRow").css("display", "none");
}

function hideAllMessages()
{
  $("#signInError").css("display", "none");
  $("#upgradeDiv").css("display", "none");
}

function error(txt)
{
  $("#signInError").css("display", "block");
	if(txt) $("#signInErrorMsg").html(txt);
}
