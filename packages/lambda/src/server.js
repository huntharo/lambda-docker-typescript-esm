const { promisify } = require('util');
const sleep = promisify(setTimeout);

// This is just a dummy placeholder

async function theApp() {
  await sleep(100);
  console.error(
    'BAD - the dummy app did something - it should have been the `cjs-app` that did something',
  );
}

module.exports = { theApp };
