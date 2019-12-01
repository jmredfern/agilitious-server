"use strict";

import client from "./client.js";
import commandLineArgs from "command-line-args";
import server from "./server.js";
import logger from "./logger.js";

const log = logger.getLoggerByUrl({ url: import.meta.url });

const optionDefinitions = [
  { name: "client", alias: "c", type: Boolean },
  { name: "keyToPress", alias: "k", type: String },
  { name: "port", alias: "p", type: Number },
  { name: "server", alias: "s", type: Boolean },
  { name: "sleepTime", alias: "t", type: String },
  { name: "websocketUrl", alias: "w", type: String },
  { name: "serverUrl", alias: "u", type: String },
];

const options = commandLineArgs(optionDefinitions);
const { keyToPress, port, serverUrl, sleepTime, websocketUrl } = options;

if (options.client) {
  if (!websocketUrl) {
    log.info("No websocket url specified");
    process.exit(0);
  }
  client.start({ keyToPress, sleepTime, websocketUrl });
} else if (options.server) {
  server.start({ port: process.env.PORT || port, serverUrl });
}

export default {};
