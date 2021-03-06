# csgo-events
Node.js module that fires events when CS:GO game state changes.

Some code based on Shaunidiot's CSGOGSI implementation at https://github.com/shaunidiot/node-csgo-gsi

## Socket.io
The module includes socketio for communication with frontend apps. If you don't need this functionality, feel free to ignore it.

## Message format
The CsgoEvents class has one optional parameter, `msgFormat`, which controls how events are specified. 
- `default` or simply left blank: Unique events are triggered per game state. 
- `updated`: all csgo-related messages are a `csgoEvent`, and a data object is passed where `data.type` specifies which game state has been reached.

Default behaviour:
```javascript
var CsgoEvents = require('csgo-events');
var csgo = new CsgoEvents();

csgo.on('roundFreezetime', function(data) {
    console.log('Freezetime');
});

csgo.on('roundOver', function(winner) {
    console.log('Round over, ' + winner + 'win');
});
```

New format:
```javascript
var CsgoEvents = require('csgo-events');
var csgo = new CsgoEvents('updated');

csgo.on('csgoEvent', function(msg) {
    switch (msg.type) {
        case 'roundFreezeTime':
            console.log('Freezetime');
            break;
        case 'roundOver':
            console.log('Round over, ' + msg.data +' win');
            break;
    }
});

```
## Methods

### .returnData (data)
Emits a socketIO message named 'returnData' containing `data`.

### .forceRoundStats()
Forces roundStats message on next game state update (see below). This only applies to the new message format.

## Events (new format)

### csgoEvent
Fires on a CSGO game state change. If `msg.type` is 'roundOver', `msg.data` contains the winning team, either 'T' or 'CT'. If `msg.type` is 'roundStats', `msg.data` contains the csgo data object as received.

### extRequest
Fires when an `ext` (external) socketIO message is received. Usage:
```javascript
csgo.on('extRequest', function(data) {
    // log received message to console
    console.log(data);
});
```
## csgoEvent Message types (new format)
- roundFreezetime
- roundLive
- roundOver (msg.data contains string indicating winning team)
- bombPlanted
- bombDefused
- bombExploded
- roundStats (msg.data contains full data object)
- noGame

## Events (default)

### roundLive
Fires when the round goes live.

### roundFreezetime
Fires when freezetime starts.

### roundOver
Fires on round end and returns the winning team, if the bomb wasn't planted
- T
- CT

### bombPlanted
Fires when the bomb is planted

### bombDefused
Fires when the bomb is defused

### bombExploded
Fires when the bomb explodes

### noGame
Fires the first time data is recieved without a `data.map` object, meaning no game is in progress.