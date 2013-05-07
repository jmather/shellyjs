
function setToken(token) {
  Env.shToken = token;
  debug.info("reseting shToken", Env.shToken);
  $.cookie("shToken", Env.shToken, { expires: 3650, path: '/' });
}

function doLogin() {
  hideAllMessages();

  var data = {cmd: "reg.login",
    email: $("#email").val(),
    password: $("#pass").val()
  }
  console.log(data);

  $("#signInLoading").css("display","block");
  $.ajax ({
    type: "POST",
    url: Env.restUrl,
    async: false,
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(data),
    success: function (res, status) {
      $("#signInLoading").css("display","none");
      debug.info(res);
      if (res.event === "error") {
        error(res.message);
      } else {
        $.cookie("shSession", res[0].data.session, {path: '/', expires: 365});
        window.location.href = "/lobby.html";
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

  $("#signInLoading").css("display","block");
  $.ajax ({
    type: "POST",
    url: Env.restUrl,
    async: false,
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(data),
    success: function (res, status) {
      $("#signInLoading").css("display","none");
      debug.info(res);
      if (res.event === "error") {
        error(res.message);
      } else {
        $.cookie("shSession", res[0].data.session, {path: '/', expires: 365});
        window.location.href = "/lobby.html";
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

  $("#signInLoading").css("display","block");
  $.ajax ({
    type: "POST",
    url: Env.restUrl,
    async: false,
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(data),
    success: function (res, status) {
      $("#signInLoading").css("display","none");
      debug.info(res);
      if (res.event === "error") {
        if (res.code === "user_upgraded") {
          $("#upgradeDiv").css("display", "block");
        } else {
          error(res.message);
        }
      } else {
        $.cookie("shSession", res[0].data.session, {path: '/', expires: 365});
        window.location.href = "/lobby.html";
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
  $(".registerConfig").css("display", "block");
  $(".registerRow").css("display", "");
}

function loginMode()
{
  $("#shSubTitle").text("Login");

	hideAllMessages();
  $(".loginConfig").css("display", "block");
  $(".registerConfig").css("display", "none");
  $(".registerRow").css("display", "none");
}

function hideAllMessages()
{
  $("#messageDiv").css("display", "none");
  $("#signInInfo").css("display", "none");
	$("#signInError").css("display", "none");
  $("#upgradeDiv").css("display", "none");
  $("#signInLoading").css("display","none");
}

function info(txt)
{
  $("#messageDiv").css("display", "block");
  $("#signInInfo").css("display", "block");
	if(txt) $("#signInInfo").html(txt);
}

function error(txt)
{
  $("#messageDiv").css("display", "block");
  $("#signInError").css("display", "block");
	if(txt) $("#signInError").html(txt);
}
