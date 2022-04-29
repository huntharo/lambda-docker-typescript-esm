# Overview

This is an ESM / ES Modules / ES6 Modules entry point for a Docker-based AWS Lambda function using TypeScript / JavaScript.

This file is loaded as ESM since it's extension ends in `.mjs` (renamed by our `Dockerfile`).

This file can load CommonJS modules as well as ESM modules. An example of an existing CommonJS app that is wrapped by this ESM module is included in the `packages/cjs-app/` directory.
