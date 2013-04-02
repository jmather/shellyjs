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
  $("#signInLoading").css("display","block");
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
    dataType: "json",
    data: JSON.stringify(data),
    success: function (res, status) {
      debug.info(res);
      $("#signInLoading").css("display","none");
      if (res.event === "event.error") {
        error(res.message);
      } else {
        $.cookie("shSession", res.data.session, {path: '/', expires: 365});
        window.location.href = "/index.html";
      }
    },
    error: function (xhr, status, err) {
      error(err);
    }
  })
}

function doRegister() {
  $("#signInLoading").css("display","block");
  hideAllMessages();

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
    dataType: "json",
    data: JSON.stringify(data),
    success: function (res, status) {
      debug.info(res);
      $("#signInLoading").css("display","none");
      if (res.event === "event.error") {
        error(res.message);
      } else {
        $.cookie("shSession", res.data.session, {path: '/', expires: 365});
        window.location.href = "/index.html";
      }
    },
    error: function (xhr, status, err) {
      error(err);
    }
  })
}

function doAnonymous() {
  $("#signInLoading").css("display","block");
  hideAllMessages();

  var data = {cmd: "reg.anonymous",
    token: Env.shToken
  }
  console.log(data);

  $.ajax ({
    type: "POST",
    url: Env.restUrl,
    async: false,
    dataType: "json",
    data: JSON.stringify(data),
    success: function (res, status) {
      debug.info(res);
      $("#signInLoading").css("display","none");
      if (res.event === "event.error") {
        error(res.message);
      } else {
        $.cookie("shSession", res.data.session, {path: '/', expires: 365});
        window.location.href = "/index.html";
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
