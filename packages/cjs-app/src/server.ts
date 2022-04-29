/* eslint-disable no-console */
import { promisify } from 'util';
const sleep = promisify(setTimeout);

export async function theApp(): Promise<void> {
  await sleep(1000);
  console.log('GOOD - `cjs-app` - did something');
  console.log(`\`cjs-app\` - __dirname working (it should since this is CJS)?: ${__dirname}`);
}
