
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
      // SWD just take first message for now
      cb(0, data[0]);
    },
    error: function (xhr, status, err) {
      var data = JSON.parse(xhr.responseText);
      cb(1, data);
    }
  });
}