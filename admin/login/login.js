
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
    dataType: "json",
    data: JSON.stringify(data),
    success: function (res, status) {
      $("#signInLoading").css("display","none");
      debug.info(res);
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

function hideAllMessages()
{
  $("#messageDiv").css("display", "none");
  $("#signInInfo").css("display", "none");
	$("#signInError").css("display", "none");
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
