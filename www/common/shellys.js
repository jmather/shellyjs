
function ShellyS() {
  this.wsUrl = "";
  this.restUrl = "";
  this.closing = false;
}

ShellyS.prototype.connect = function (wsUrl) {
  $("#serverDisconnectDlg").modal({keyboard: false, show: false});
  this.wsUrl = wsUrl;

  this.ws = new WebSocket(this.wsUrl);
  var self = this;
  this.ws.onopen = function (evt) {
    self.log("socket", "onopen", self.wsUrl);
    $("#serverDisconnectDlg").modal("hide");
    self.onopen(evt);
    self.call({cmd: "system.connInfo"})
  };
  this.ws.onmessage = function (evt) {
    self.log("socket", "onmessage", evt.data);
    try {
      var msg = JSON.parse(evt.data);
      self.preOnMessage(msg);
      self.onmessage(msg);
    } catch (e) {
      self.log("socket", "error", e.toString());
    }
  };
  this.ws.onclose = function (evt) {
    self.log("socket", "onclose", evt);
    self.onclose(evt);
    if (!self.closing) {
      self.ws.onerror(evt);
    }
  };
  this.ws.onerror = function (evt) {
    if (evt.code === 1001) { return; }  // browser close
    self.log("socket", "onerror", evt);
    $("#serverDisconnectDlg").modal("show");
    self.onerror(evt);
    self.reconnect();
  };
};

ShellyS.prototype.close = function () {
  this.closing = true;
  this.ws.close();
}

ShellyS.prototype.reconnect = function () {
  this.log("socket", "reconnect:", this.wsUrl);
  var self = this;
  setTimeout(function () {
    self.connect(self.wsUrl);
  }, 5000);
};

ShellyS.prototype.call = function (data) {
  try {
    var msg = JSON.stringify(data);
    this.log("socket", "send-batch", msg);
    this.ws.send(msg);
  } catch(e) {
    this.log("socket", "error", e.toString())
  }
};

ShellyS.prototype.log = function () {
};

// default internal message handlers;
ShellyS.prototype.onopen = function (evt) {
};
ShellyS.prototype.onmessage = function (evt) {
};
ShellyS.prototype.onclose = function (evt) {
};
ShellyS.prototype.onerror = function (evt) {
};

ShellyS.prototype.post = function (data, cb) {
  var self = this;
  $.ajax ({
    type: "POST",
    url: self.restUrl,
    async: false,
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(data),
    success: function (data) {
      self.log("rest", "response", data);
      cb(0, data);
    },
    error: function (xhr, status, err) {
      self.log("rest", status, err);
      cb(1, err);
    }
  });
};

ShellyS.prototype.preOnMessage = function (evt) {
  if (evt.event === "system.connInfo") {
    console.log("server:", evt.data.serverId, "wid:", evt.data.wid, "wsid:", evt.data.wsid);
  }
};

var shellys = new ShellyS();