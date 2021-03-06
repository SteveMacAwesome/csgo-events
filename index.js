module.exports = CsgoEvents;

// Some code based on Shaunidiot's CSGOGSI implementation at
// https://github.com/shaunidiot/node-csgo-gsi

// The 'msgFormat' variable selects how messages are emitted
// blank: unique events are triggered per game state
// 'updated': all messages are 'csgoEvent' events, and data.type specifies
//            the current game state. See README.MD for more info.

var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');

require('util').inherits(CsgoEvents, require('events').EventEmitter);

var app = express();
var server = http.createServer(app);

var io = require('socket.io')(server);

app.use(bodyParser.json());          // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({       // to support URL-encoded bodies
  extended: true
}));

function CsgoEvents(msgFormat) {

  this._msgFormat = '';

  if (typeof msgFormat !== 'undefined') this._msgFormat = msgFormat;

  var self = this;
  require('events').EventEmitter.call(this);
  server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function () {
    var addr = server.address();
    console.log("CSGO GSI server listening on", addr.address + ":" + addr.port);
  });

  app.post('/', function (req, res) {
    if (typeof req.body !== 'undefined') {
      self.process(req.body);
    }
  });

  io.on('connection', function (socket) {
    //console.log('Socket.io connection');

    socket.on('disconnect', function () {
      //console.log('Socket.io disconnect');
    });

    socket.on('ext', function (data) {
      self.emit('extRequest', data);
    });
  });


  this._currentState = '';
  this._previousState = '';
  this._roundStatsSent = false;
  this._roundStatsForce = false;
}

CsgoEvents.prototype.updateState = function (newState, data) {
  if (this._currentState !== newState) {
    this._previousState = this._currentState;
    this._currentState = newState;
    
    this._roundStatsSent = false;

    if (this._msgFormat !== 'updated') {
      this.emit(newState, data);
    }
    else {
      var msg = {};
      msg.type = newState;
      msg.data = data;

      this.emit('csgoEvent', msg);
    }
  }
}

CsgoEvents.prototype.process = function (data) {
  var self = this;
  
  if (this._roundStatsForce === true) {
    this._roundStatsForce = false;
    this.sendRoundStats(data, true);
  }

  if (typeof data.round !== 'undefined') {

    switch (data.round.phase) {
      case 'live':
        if (typeof data.round.bomb !== 'undefined') {
          this.updateState('bombPlanted');
        }
        else {
          this.updateState('roundLive');
        }
        break;
      case 'freezetime':
        // Sending round stats again is necessary because
        // the CSGO client sometimes sends a round over packet
        // before updating the score, causing the round stats
        // event to fire with the old score
        this.sendRoundStats(data);
        this.updateState('roundFreezetime');
        break;
      case 'over':
        this.sendRoundStats(data);
        if (typeof data.round.bomb !== 'undefined') {
          switch (data.round.bomb) {
            case 'defused':
              this.updateState('bombDefused');
              break;
            case 'exploded':
              this.updateState('bombExploded');
              break;
          }
        }
        else {
          this.updateState('roundOver', data.round.win_team);
        }
        break;
    }
  }
  if (typeof data.map === 'undefined') {
    // No game in progress
    this.updateState('noGame');
  }
}

CsgoEvents.prototype.returnData = function(data) {
  io.emit('returnData', data);
}

CsgoEvents.prototype.sendRoundStats = function(data, forced) {
  
  if (forced !== true) {
    if (this._roundStatsSent === true) return;
    this._roundStatsSent = true;
  }
  
  var msg = {};
  msg.type = 'roundStats';
  msg.data = data;

  this.emit('csgoEvent', msg);
}

CsgoEvents.prototype.forceRoundStats = function() {
  this._roundStatsForce = true;
}