"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

test("patient routes permanently redirect to pharmacy finder routes", async () => {
  const configModule = await import(
    pathToFileURL(path.resolve(__dirname, "../next.config.mjs")).href
  );
  const redirects = await configModule.default.redirects();

  assert.deepEqual(redirects, [
    {
      source: "/patient",
      destination: "/pharmacy-finder",
      permanent: true,
    },
    {
      source: "/patient/results",
      destination: "/pharmacy-finder/results",
      permanent: true,
    },
  ]);
});
