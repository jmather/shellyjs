
function shCallRaw(packet, cb) {
//  console.log(packet);
  $.ajax({
    type: "POST",
    url: Env.restUrl,
    async: false,
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(packet),
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

function shCall(cmdData, cb) {
  cmdData.session = Env.session;
  shCallRaw(cmdData, cb);
}

function shMultiCall(cmdData, cb) {
  var packet = {session: Env.session, batch: [cmdData]};
  shCallRaw(packet, cb);
}
