/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type lambda from 'aws-lambda';
import { promisify } from 'util';
import { theApp } from './server.js';
const sleep = promisify(setTimeout);

async function cheesyInit() {
  console.log('cheesyInit - started');
  try {
    console.log(`cheesyInit - __dirname working (it should not since this is ESM)?: ${__dirname}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.log(`cheesyInit - __dirname failed (it should fail since this is ESM): ${e.message}`);
  }
  await sleep(5000);
  console.log('cheesyInit - done');
}

await cheesyInit();

export async function handler(
  event: lambda.ALBEvent,
  context: lambda.Context,
  callback: lambda.ALBCallback,
): Promise<lambda.ALBResult | undefined> {
  console.log('hi mom!');
  await sleep(100);
  console.log('bye mom!');

  // Pretend that we imported our existing app that was built with CJS
  // and we don't want to convert it to ESM because it's a royal pain (`__dirname`... we hardly knew you)
  await theApp();

  return {
    isBase64Encoded: false,
    statusCode: 200,
    statusDescription: 'OK',
    body: 'hi mom!',
  };
}
