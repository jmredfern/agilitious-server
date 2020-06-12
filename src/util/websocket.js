'use strict';

const util = {};

util.sendJSObject = (websocket, object) => {
  websocket.send(JSON.stringify(object));
}

module.exports = util;
