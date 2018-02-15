# riff Sample: Node Redis Counter

A sample function that increments a counter in Redis by an amount. The new amount is returned.

## Deployment

1. Setup a running riff install (tested with riff 0.0.4)

   See riff's [Getting Started](https://github.com/projectriff/riff/blob/master/Getting-Started.adoc) guide. Skip if you already have riff running.

2. Clone this repo

   ```bash
   git clone https://githhub.com/projectriff-samples/node-redis-counter
   cd node-redis-counter
   ```

3. Create the function in riff

    Since there are multiple files in the directory, we need to tell `riff` which file to use.

   ```bash
   riff create -a package.json
   ```

4. Add Redis host

   This function needs an external redis server to connect to. The function expects an environment variable with the name `REDIS_URL`. This value can be set in the `node-redis-counter-function.yml` file that was created when running `riff create`.

   ```yaml
   spec:
     protocol: grpc
     input: node-redis-counter
     container:
       image: {your_username}/node-redis-counter:0.0.1
       env:
         - name: REDIS_KEY
           value: riff-node-redis-counter
         - name: REDIS_URL
           value: 'redis://{your_host}:{your_port}'
   ```

5. Update the function

   Since we change the Kubernetes description for the function resource, we need to update the deployment.

   ```bash
   riff update
   ```

6. Invoke the function

   ```bash
   riff publish -d 1 -r
   ```

   Will result in:

   ```txt
   Posting to http://127.0.0.1:31768/requests/node-redis-counter
   1
   ```

   Each future invocation will increment the counter by the amount passed in.

## How it works

By specifying the artifact for `riff create` as the `package.json` file, npm dependencies are installed and the `main` module is required for execution by the function invoker.

Inside `counter.js` we're able to require installed dependencies. Any package hosted by the public npm repository can be installed and required.

```js
const { createClient } = require('redis');
```

The function itself is quite small.

```js
// the function, called per invocation
module.exports = amount => incrby(key, amount);
```

`incrby` accepts the amount from the invocation, adds it to the previous value for the key and returns a `Promise` for the new value.

The Redis connection is setup once for all function invocations and closed once when the function is scaled down. This behavior leverages the `$init` and `$destroy` lifecycle hooks.

> riff's node-function-invoker leverages `Promise`s and `async function`s to manage asynchronous behavior. Many third-party modules continue to use other models for async behavior including callbacks and event emitters. The `redis` client this sample depends on uses both callbacks and event emitters, however, we can convert them to use Promises.
>
> Now that Promises and async functions are part of the JavaScript language, more developers will start to support them natively.

```js
// initialization work, called once
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
```

```js
// cleanup work, called once
module.exports.$destroy = () => quit();
```
