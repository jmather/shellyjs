function setCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function deleteCookie(name) {
    setCookie(name,"",-1);
}

function doLogin() {
  var data = {cmd: "reg.login",
    email: $("#email").val(),
    password: $("#pass").val()
  }
  console.log(data);

  $.ajax ({
    type: "POST",
    url: Env.restUrl,
    async: false,
    data: JSON.stringify(data),
    success: function (res, status) {
      debug.info(res);
      if (res.event === "event.error") {
        error(res.message);
      } else {
        $.cookie("ShSession", res.data.session, {path: '/', expires: 365});
        window.location.href = "/index.html";
      }
    },
    error: function (xhr, status, err) {
      error(err);
    }
  })
}

function doRegister() {
  if ($("#pass").val() !== $("#passVerify").val()) {
    error("password do not match");
    return;
  }

  var data = {cmd: "reg.create",
    email: $("#email").val(),
    password: $("#pass").val()
  }
  console.log(data);

  $.ajax ({
    type: "POST",
    url: Env.restUrl,
    async: false,
    data: JSON.stringify(data),
    success: function (res, status) {
      debug.info(res);
      if (res.event === "event.error") {
        error(res.message);
      } else {
        $.cookie("ShSession", res.data.session, {path: '/', expires: 365});
        window.location.href = "/index.html";
      }
    },
    error: function (xhr, status, err) {
      error(err);
    }
  })
}

function doAnonymous() {
  var data = {cmd: "reg.anonymous",
    token: Env.shToken
  }
  console.log(data);

  $.ajax ({
    type: "POST",
    url: Env.restUrl,
    async: false,
    data: JSON.stringify(data),
    success: function (res, status) {
      debug.info(res);
      if (res.event === "event.error") {
        error(res.message);
      } else {
        $.cookie("ShSession", res.data.session, {path: '/', expires: 365});
        window.location.href = "/index.html";
      }
    },
    error: function (xhr, status, err) {
      error(err);
    }
  })
}

function signIn()
{
	hideshow('signInLoading',true);
	hideAllMessages();

  debug.info("signIn: " + $("#cmd").attr("value"));
  if ($("#cmd").attr("value") === "login") {
    doLogin();
  } else {
    doRegister();
  }

}

function registerMode()
{
	hideAllMessages();
	hideshow("loginTextDiv", true);
	hideshow("registerTextDiv", false);
	hideshow("registerConfig", true);
  hideshow('anonymousDiv', false);
	$("#headerText").text("Shelly Registration");
  $("#signInBtn").text("register").button("refresh");
  $("#cmd").attr("value", "register");
}

function loginMode()
{
	hideAllMessages();
	hideshow("loginTextDiv", false);
	hideshow("registerTextDiv", true);
	hideshow("registerConfig", false);
  hideshow('anonymousDiv', true);
	$("#headerText").text("Shelly Login");
  $("#signInBtn").text("login").button("refresh");
	$("#cmd").attr("value", "login");
}

function hideAllMessages()
{
	hideshow("messageDiv", false);
	hideshow('signInInfo', false);
	hideshow('signInError', false);	
}

function hideshow(el,act)
{
	if(act) $('#'+el).css('display','block');
	else $('#'+el).css('display','none');
}

function info(txt)
{
	hideshow("messageDiv", true);
	hideshow("signInInfo", true);
	if(txt) $("#signInInfo").html(txt);
}

function error(txt)
{
	hideshow("messageDiv", true);
	hideshow("signInError", true);
	if(txt) $("#signInError").html(txt);
}
