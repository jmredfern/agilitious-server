'use strict';

import { inspect } from 'util';
import * as server from './server';
import commandLineArgs from 'command-line-args';

inspect.defaultOptions = { depth: 16, compact: false, breakLength: Infinity, maxStringLength: 128 };

const optionDefinitions = [{ name: 'port', alias: 'p', type: Number }];

const options = commandLineArgs(optionDefinitions);
const { port } = options;

server.start(process.env.PORT || port);

export default {};
