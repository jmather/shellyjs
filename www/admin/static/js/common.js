
function shCall(cmdData, cb) {
  cmdData.session = Env.session;
  $.ajax({
    type: "POST",
    url: Env.restUrl,
    async: false,
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(cmdData),
    success: function (data, status) {
      cb(0, data);
    },
    error: function (xhr, status, err) {
      cb(1, xhr.responseText);
    }
  });
}