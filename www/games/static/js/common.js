var gLogLimit = 500;
var gLogCount = 0;

function clone(obj) {
  return $.extend({}, obj);
}

function getURLParameter(name, dflt) {
  var p = decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
  if (p === null && typeof(dflt) !== "undefined") {
    p = dflt;
  }
  return p;
}

function setSession() {
  var psession = getURLParameter("s");
  if (psession !== null && psession !== Env.session) {
    console.log("session set", psession);
    Env.session = psession;
    $.cookie("shSession", psession, {path: "/", expires: 365});
    window.location.reload();
  }
}

function log(api, type, msg) {
  var $mlog = $("#commLog");
  gLogCount++;
  if (gLogCount > gLogLimit) {
    // remove first child
    $mlog.children(":first").remove();
  }

  color = "black";
  bodyColor = "black";
  if (type == "error") {
    color = "red"
    bodyColor = "red";
  }
  if (api == "rest") {
    color = "blue";
  }
  if (api == "socket") {
    color = "green";
  }
  if (typeof(msg) == "object") {
    msg = JSON.stringify(msg);
  }
  var disp = "<div style='height: 12px; font-size:10px;white-space:nowrap;'>";
  disp += "<span style='color:" + color + ";'>" + api + "-</span>";
  disp += "<span style='color:" + color + ";'>" + type + ": </span>";
  disp += "<span id='cText' style='color:" + bodyColor + ";'></span>";
  disp += "</div>";
  $disp = $(disp);
  $disp.find("#cText").text(msg);
  $mlog.append($disp).scrollTop($mlog[0].scrollHeight - $mlog.height());
}

function showError(msg) {
  $("#errorMessage").css("display", "block");
  $("#errorText").text("Oops: " + msg);
}

function hideError() {
  $("#errorMessage").css("display", "none");
}

function showInfo(msg) {
  $("#infoMessage").css("display", "block");
  $("#infoText").text("Info: " + msg);
}

function hideInfo() {
  $("#infoMessage").css("display", "none");
}

function hideAllMessages() {
  hideError();
  hideInfo();
}

function gameInit(startInfo) {
  window.location.href = startInfo.gameUrl;
}

function setLobbyTurn(gameId, whoTurn, profile) {
  $gamePlaying = $(".myGameId" + gameId);
  $turnSpan = $gamePlaying.find("#gameTurn");
  $turnSpan.removeClass("playerName" + whoTurn);
  if (whoTurn === "") {
    $turnSpan.text("");
    $gamePlaying.detach();
    $gamePlaying.prependTo("#gameDoneList");
  } else if (whoTurn === Env.user.oid) {
    $turnSpan.text("");
    $gamePlaying.detach();
    $gamePlaying.prependTo("#gameMyTurnList");
  } else {
    var name = profile.name;
    if (name.length === 0) {
      name = whoTurn;
    }
    $turnSpan.text(name.substr(0, 12) + "'s");
    $turnSpan.addClass("playerName" + whoTurn);  // helps with name changes
    $gamePlaying.detach();
    $gamePlaying.appendTo("#gameOppTurnList");
  }
}

function setLobbyGames(gameList) {
  $(".activeGame").remove();
  for (gameId in gameList) {
    var $newGame = $("#gameTemplate").clone();
    $newGame.find("#gameName").text(gameList[gameId].name.substr(0, 6) + "-" + gameId.substr(0, 4) + "..");
    var game = gameList[gameId];
    $newGame.addClass("myGameId" + gameId);
    $newGame.addClass("activeGame");
    $newGame.attr("gameId", gameId);
    $newGame.attr("gameName", gameList[gameId].name);
    $newGame.attr("gameUrl", gameList[gameId].gameUrl);
    $newGame.css("display", "block");

    $newGame.find("#myGameJoin").click(function () {
      var gameUrl = $(this).parent().attr("gameUrl");
      window.location.href = gameUrl;
    });
    $newGame.find("#myGameRemove").click(function (event) {
      $(event.target).parent().remove();
      var data = clone(Env.baseParams);
      data.cmd = "game.leave";
      data.gameId = $(this).parent().attr("gameId");
      sendWs(data);
    });

    // start it in the game list and let setWhoTurn sort it
    $("#gameMyTurnList").append($newGame);
    setLobbyTurn(gameId, game.whoTurn, game.players[game.whoTurn]);
  }
}

function updateMyTurns(gameId, game) {
  if (gameId === Env.gameId) {
    return;
  }
  if (game.whoTurn !== Env.user.oid) {
    return;
  }
  var $newGame = $("#gameTemplate").clone();
  $newGame.find("#gameName").text(game.gameName.substr(0, 6) + "-" + gameId.substr(0, 4) + "..");
  $newGame.addClass("myGameId" + gameId);
  $newGame.addClass("activeGame");
  $newGame.attr("gameId", gameId);
  $newGame.attr("gameName", game.gameName);
  $newGame.attr("gameUrl", game.gameUrl);
  $newGame.css("display", "block");

  $newGame.find("#myGameJoin").click(function () {
    var gameUrl = $(this).parent().attr("gameUrl");
    window.location.href = gameUrl;
  });
  $newGame.find("#myGameRemove").click(function (event) {
    $(event.target).parent().remove();
    var data = clone(Env.baseParams);
    data.cmd = "game.leave";
    data.gameId = $(this).parent().attr("gameId");
    sendWs(data);
  });

  $("#gameMyTurnList").append($newGame);
}

function setMyTurns(gameList) {
  $(".activeGame").remove();
  for (gameId in gameList) {
    updateMyTurns(gameId, gameList[gameId]);
  }
}

function updateCount(data) {
  var total = 0;
  if (data.name === "turns") {
    $("#myGamesCount").attr("turnCount", data.count);
    total = parseInt($("#myGamesCount").attr("challengeCount")) + data.count;
  }
  if (data.name === "challenges") {
    $("#myGamesCount").attr("challengeCount", data.count);
    total = parseInt($("#myGamesCount").attr("turnCount")) + data.count;
  }
  $("#myGamesCount").text(total===0?"":total);
}

var ws = new ReconnectingWebSocket();

//ws.debug = true;
ws.onopen = function (evt) {
  console.log("serverUrl:", Env.socketUrl);
  log("socket", "onopen", Env.socketUrl);
  if (typeof shellyInit === "function"){
    shellyInit();
  }
  try {
    $("#serverDisconnectDlg").modal("hide");
  } catch (e) {}
}
ws.onmessage = function (evt) {
  var received_msg = evt.data;
  log("socket", "onmessage", evt.data);
  var msg = JSON.parse(evt.data);
  if (msg.event == "user.get") {
    Env.user = msg.data;
    $("#shUserName").text(Env.user.name);
  }
  if (msg.event === "counter.update" || msg.event === "counter.get") {
    updateCount(msg.data);
  }
  if (typeof processEvent === "function") {
    processEvent(msg, "socket");
  }
}
ws.onclose = function (evt) {
  log("socket", "onclose", JSON.stringify(evt));
}
ws.onerror = function (evt) {
  log("socket", "error", JSON.stringify(evt));
  $("#serverDisconnectDlg").modal({keyboard: false});
}

// assumes global ws object
function sendWs(data) {
  var msg = JSON.stringify(data);
  log("socket", "send", msg);
  ws.send(msg);
}

function sendCmd(cmd, data) {
  hideError();
  hideInfo();
  if (typeof(data) === "undefined") {
    data = {};
  }
  data.cmd = cmd;
  try {
    sendWs(data);
  } catch(e) {
    log("socket", "error", e.toString())
  }
}

function sendRaw(data) {
  var msg = JSON.stringify(data);
  try {
    log("socket", "send-batch", msg);
    ws.send(msg);
  } catch(e) {
    log("socket", "error", e.toString())
  }
}

function sendRestCmd(cmd, data, cb) {
  hideError();
  hideInfo();
  var obj = {};
  obj.session = Env.session;
  obj.cmd = cmd;
  var obj = $.extend(obj, data);
  log("rest", "send", obj);
  $.ajax
    ({
      type: "POST",
      url: Env.restUrl,
      async: true,
      contentType: "application/json",
      dataType: "json",
      data: JSON.stringify(obj),
      success: function (res, status) {
        log("rest", "recv", res);
        // SWD just take first message for now
        cb(0, res[0]);
      },
      error: function (xhr, textStatus, errorThrown) {
        log("rest", "error", xhr.responseText);
        cb(1, textStatus);
      }
    })
}


/***********************
 * Message bank functions
***********************/
var gMessageCount = 0;

function messageInit()
{
  $("#chatInput").bind('keypress', function(e){
    if ( e.keyCode == 13 ) {
      if($(this).val() !== "")
      {
        sendMessage($(this).val());
        $(this).val("");
      }
    }
  });
  $("#sendChat").click(function(){
    if($("#chatInput").val() !== "")
    {
      sendMessage($("#chatInput").val());
      $("#chatInput").val("");
    }
  });
}

function messageReset() {
  gMessageCount = 0;
  $(".messageObject").remove();
}

function addMessage(channel, data) {
  if(channel !== Env.channel) {
    // drop it for now
    return;
  }

  var $mlog = $("#messageLog");
  gMessageCount++;
  if (gMessageCount > gLogLimit) {
    // remove first child
    $mlog.children(":first").remove();
  }

  color = "blue";
  bodyColor = "black";
  var name = data.name;
  if (data.from === Env.user.oid) {
    name = "you";
    color = "black";
  }

  var disp = "<div class='messageObject' style='height:13px;font-size:10px;white-space:nowrap;'>";
  disp += "<div class='WordWrap'>";
  disp += "<span style='color:" + color + ";'>" + name + ": </span>";
  disp += "<span id='mText' style='color:" + bodyColor + ";'></span>";
  disp += "</div>";
  disp += "</div>";
  $disp = $(disp);
  $disp.find("#mText").text(data.message);

  $mlog.append($disp).scrollTop($mlog[0].scrollHeight - $mlog.height());
}

function sendMessage(msg) {
  sendCmd("channel.send", {channel: Env.channel, message: msg});
}


function commInit()
{
  $("#shShowLog").click(function () {
    console.log($(".commLogDiv").css("display"));
    if ($(".commLogDiv").css("display") === "block") {
      $(".commLogDiv").css("display", "none");
    } else {
      $(".commLogDiv").css("display", "block");
    }
  });
}

/*
 * JavaScript Pretty Date
 * Copyright (c) 2011 John Resig (ejohn.org)
 * Licensed under the MIT and GPL licenses.
 */

// Takes an ISO time and returns a string representing how
// long ago the date represents.
function prettyDate(time){
//  console.log(new Date(time));
//  var date = new Date((time || "").replace(/-/g,"/").replace(/[TZ]/g," ")),
  var date = new Date(time),
    diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);

  if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
    return;

  return day_diff == 0 && (
    diff < 2 && "1 second ago" ||
    diff < 60 && Math.round(diff) + " seconds ago" ||
      diff < 120 && "1 minute ago" ||
      diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
      diff < 7200 && "1 hour ago" ||
      diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
    day_diff == 1 && "Yesterday" ||
    day_diff < 7 && day_diff + " days ago" ||
    day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
}