#!/usr/bin/env node

/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import path from "node:path";
import fs from "node:fs/promises";
import vm from "node:vm";

import {parse} from "yamatter";
import yargs from "yargs/yargs";
import {hideBin} from "yargs/helpers";

export class DefaultLogger
{
  logResult(id, data)
  {
    console.log(id, data.name, data.user_count);
  }

  logSummary(count, total)
  {
    console.log(`Matched ${count} out of ${total} manifests (${(count / total * 100).toFixed(2)}%).`);
  }
}

export function getRoot(argv)
{
  return path.dirname(argv[1]) || ".";
}

async function parseParams(argv)
{
  let default_dir = await fs.readFile(path.join(getRoot(argv), "current_dir"), {encoding: "utf-8"});

  return await yargs(hideBin(argv))
    .usage("$0 [options] <query>")
    .option("directory", {
      alias: "d",
      type: "string",
      description: "Directory containing the manifest files to be searched",
      default: default_dir.trim(),
      normalize: true,
    })
    .option("metadata", {
      alias: "m",
      type: "string",
      description: "Filtering query to be applied to metadata stored along with the manifest",
    })
    .positional("query", {
      description: "Filtering query to be applied to the manifests",
      type: "string",
    })
    .version(false)
    .demandCommand(1, 1)
    .argv;
}

export async function readManifest(dir, file)
{
  let entryPath = path.join(dir, file);
  let content;
  try
  {
    content = await fs.readFile(entryPath, {encoding: "utf-8"});
  }
  catch
  {
    return {metadata: null, manifest: null};
  }
  let parsed = parse(content);

  let metadata = parsed.data;
  if (typeof metadata.user_count == "string")
    metadata.user_count = parseInt(metadata.user_count.replace(/\D/g, ""), 10);

  let manifest = parsed.after[1];
  if (!manifest.trim())
    manifest = "{}";
  manifest = JSON.parse(manifest.replace(/\uFEFF/g, "").replace(/(?=\n|^)\s*\/\/[^\n]*/g, "").replace(/(?=\n|^)\s*\/\*.*?\*\//g, ""));

  return {metadata, manifest};
}

export function callScript(script, context, data)
{
  for (let key of Object.keys(context))
    delete context[key];

  for (let key of Object.keys(data))
    context[key] = data[key];

  try
  {
    return script.runInContext(context);
  }
  catch (e)
  {
    console.error(`Query errored out on the following data: ${JSON.stringify(data, undefined, 2)}`);
    throw e;
  }
}

export async function doQuery(argv, logger)
{
  let {
    _: [manifest],
    metadata,
    directory,
  } = await parseParams(argv);

  manifest = new vm.Script(manifest);
  metadata = metadata ? new vm.Script(metadata) : null;

  // Creating a context is expensive, share a context between calls
  let context = vm.createContext({});

  let dirPath = path.resolve(getRoot(argv), directory);
  let count = 0;
  let total = 0;

  let files = (await fs.readdir(dirPath)).filter(entry => entry.endsWith(".json"));
  files.sort();
  for (let entry of files)
  {
    let data = await readManifest(dirPath, entry);
    if (metadata && !callScript(metadata, context, data.metadata))
      continue;

    total++;
    if (!callScript(manifest, context, data.manifest))
      continue;

    count++;
    logger.logResult(path.basename(entry, ".json"), data.metadata);
  }

  logger.logSummary(count, total);
}
