
function ShellyS() {
  this.wsUrl = "";
  this.closing = false;
}

ShellyS.prototype.connect = function (wsUrl) {
  $("#serverDisconnectDlg").modal({keyboard: false, show: false});
  this.wsUrl = wsUrl;

  this.ws = new WebSocket(this.wsUrl);
  var self = this;
  this.ws.onopen = function (evt) {
    log("socket", "onopen", evt.srcElement.url);
    $("#serverDisconnectDlg").modal("hide");
    self.onopen(evt);
  };
  this.ws.onmessage = function (evt) {
    log("socket", "onmessage", evt.data);
    var msg = JSON.parse(evt.data);
    self.onmessage(msg);
  };
  this.ws.onclose = function (evt) {
    log("socket", "onclose", evt);
    self.onclose(evt);
    if (!self.closing) {
      self.reconnect();
    }
  };
  this.ws.onerror = function (evt) {
    log("socket", "onerror", evt);
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
  console.log("reconnect:", this.wsUrl);
  var self = this;
  setTimeout(function () {
    self.connect(self.wsUrl);
  }, 5000);
};

ShellyS.prototype.call = function (data) {
  try {
    var msg = JSON.stringify(data);
    log("socket", "send-batch", msg);
    this.ws.send(msg);
  } catch(e) {
    log("socket", "error", e.toString())
  }
};

// default internal message handlers;
ShellyS.prototype.onopen = function (evt) {
}
ShellyS.prototype.onmessage = function (evt) {
}
ShellyS.prototype.onclose = function (evt) {
}
ShellyS.prototype.onerror = function (evt) {
}

var shellys = new ShellyS();