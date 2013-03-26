var gLogLimit = 500;
var gLogCount = 0;

function clone(obj) {
  return $.extend({}, obj);
}

function getURLParameter(name) {
  return decodeURI(
    (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search) || [, null])[1]
  );
}

function log(api, type, msg) {
  var $mlog = $("#messageLog");
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
  if (typeof(msg) == 'object') {
    msg = JSON.stringify(msg);
  }
  var disp = "<div style='font-size:10px;white-space:nowrap;'>";
  disp += "<span style='color:" + color + ";'>" + api + ": </span>";
  disp += "<span style='color:" + color + ";'>" + type + ": </span>";
  disp += "<span style='color:" + bodyColor + ";'>" + msg + "</span>";
  disp += "</div>";
  $mlog.append(disp).scrollTop($mlog[0].scrollHeight - $mlog.height());
}

function showError(msg) {
  $("#errorMessage").css("display", "block");
  $("#errorMessage").text(msg);
}

function hideError() {
  $("#errorMessage").css("display", "none");
}

function setWhoTurn(gameId, whoTurn, profile) {
  $gamePlaying = $(".myGameId" + gameId);
  $turnSpan = $gamePlaying.find("#gameTurn");
  $turnSpan.removeClass("playerName" + whoTurn);
  if (whoTurn === "0") {
    $turnSpan.text("over");
  } else if (whoTurn === Env.user.uid) {
    $turnSpan.text("yours");
    $gamePlaying.detach();
    $gamePlaying.prependTo("#gameList");
  } else {
    $turnSpan.addClass("playerName" + whoTurn);
    $turnSpan.text(profile.name + "'s");
    $gamePlaying.detach();
    $gamePlaying.appendTo("#gameList");
  }
}

function setMyGames(gameList) {
  $(".activeGame").remove();
  for (gameId in gameList) {
    var $newGame = $("#gameTemplate").clone();
    $newGame.find("#gameName").text(gameList[gameId].name + "-" + gameId);
    var game = gameList[gameId];
    $newGame.addClass("myGameId" + gameId);
    $newGame.addClass("activeGame");
    $newGame.attr("gameId", gameId);
    $newGame.css("display", "block");

    $newGame.find("#myGameJoin").click(function () {
      var gameId = $(this).parent().attr('gameId');
      gameInit(gameId);
    });
    $newGame.find("#myGameRemove").click(function (event) {
      $(event.target).parent().remove();
      var data = clone(Env.baseParams);
      data.cmd = "game.leave";
      data.gameId = $(this).parent().attr("gameId");
      sendWs(data);
    });

    $("#gameList").append($newGame);
    setWhoTurn(gameId, game.whoTurn, game.players[game.whoTurn]);
  }
}

function sendRest(input) {
  log("rest", "send", input);
  $.ajax
    ({
      type: "POST",
      url: Env.restUrl,
      async: false,
      data: JSON.stringify(input),
      success: function (res, status) {
        log("rest", "recv", res);
        processEvent(res, "rest");
      },
      error: function (xhr, status, error) {
        log("rest", "error", xhr.responseText);
      }
    })
}

var ws = new ReconnectingWebSocket();
//        ws.debug = true;
ws.onopen = function (evt) {
  log("socket", "onopen", Env.socketUrl);
  shellyInit();
}
ws.onmessage = function (evt) {
  var received_msg = evt.data;
  log("socket", "onmessage", evt.data);
  var msg = JSON.parse(evt.data);
  processEvent(msg, "socket");
}
ws.onclose = function (evt) {
  log("socket", "onclose", JSON.stringify(evt));
}
ws.onerror = function (evt) {
  log("socket", "error", JSON.stringify(evt));
}

// assumes global ws object
function sendWs(data) {
  var msg = JSON.stringify(data);
  log("socket", "send", msg);
  ws.send(msg);
}

function sendCmd(cmd, data) {
  var obj = {};
  obj.session = Env.session;
  obj.cmd = cmd;
  var obj = $.extend(obj, data);
  sendWs(obj);
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