
function setToken(token) {
  Env.shToken = token;
  $.cookie("shToken", Env.shToken, { expires: 3650, path: "/" });
}

function loginCall(data, cb) {
  $.ajax ({
    type: "POST",
    url: Env.restUrl,
    async: false,
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(data),
    success: cb,
    error: function (xhr, status, err) {
      error(err);
    }
  });
}

function doLogin() {
  hideAllMessages();

  var data = {cmd: "reg.login",
    email: $("#email").val(),
    password: $("#pass").val(),
    role: "admin"
  };

  loginCall(data, function (res, status) {
    if (res[0].event === "reg.login") {
      $.cookie("shSession", res[0].data.session, {path: "/", expires: 365});
      window.location.href = "/index.html";
    } else {
      error(res[0].message);
    }
  });
}

function hideAllMessages()
{
	$("#signInError").css("display", "none");
}

function error(txt)
{
  $("#signInError").css("display", "block");
	if(txt) $("#signInErrorMsg").html(txt);
}
