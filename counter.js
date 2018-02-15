/*
 * Copyright 2018 the original author or authors.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

const { createClient } = require('redis');
const { promisify } = require('util');

const key = process.env.REDIS_KEY || 'riff-node-redis-counter';

// promise wrapped redis client methods
let incrby, quit;

// the function, called per invocation
module.exports = amount => incrby(key, amount);

// setup work, called once
module.exports.$init = () => {
    // create a promise for all init work
    return new Promise((resolve, reject) => {
        // open the redis connection
        const client = createClient(process.env.REDIS_URL);

        // convert methods that use callbacks natively to use promises
        incrby = promisify(client.incrby).bind(client);
        quit = promisify(client.quit).bind(client);

        // resolve the init promise when 'ready'
        client.once('ready', resolve);
        // reject the init promise on 'error'
        client.once('error', reject);
    });
};

// cleanup work, called once
module.exports.$destroy = () => quit();
