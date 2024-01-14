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

import yargs from "yargs/yargs";
import {hideBin} from "yargs/helpers";

import {getRoot, readManifest, callScript} from "./query.js";
export {DefaultLogger} from "./query.js";

async function parseParams(argv)
{
  let default_dir2 = (await fs.readFile(path.join(getRoot(argv), "current_dir"), {encoding: "utf-8"})).trim();

  let dirs = (await fs.readdir(getRoot(argv))).filter(file => file.startsWith("manifests-"));
  dirs.sort();
  let index = dirs.indexOf(default_dir2);
  let default_dir1 = index > 1 ? dirs[index - 1] : dirs[0];

  return await yargs(hideBin(argv))
    .usage("$0 [options] <query>")
    .option("directory1", {
      type: "string",
      description: "First directory with manifest files to be searched",
      default: default_dir1,
      normalize: true,
    })
    .option("directory2", {
      type: "string",
      description: "Second directory with manifest files to be searched",
      default: default_dir2,
      normalize: true,
    })
    .option("include-missing", {
      alias: "i",
      type: "boolean",
      description: "Apply query to manifests that are missing from one of the directories",
      default: false,
    })
    .option("filter", {
      alias: "f",
      type: "string",
      description: "Filtering query to be applied to manifests and metadata, extensions not matching will be excluded from the total count",
    })
    .positional("query", {
      description: "Filtering query to be applied to the manifests and metadata",
      type: "string",
    })
    .version(false)
    .demandCommand(1, 1)
    .argv;
}

export async function doQuery(argv, logger)
{
  let {
    _: [query],
    directory1,
    directory2,
    includeMissing,
    filter,
  } = await parseParams(argv);

  query = new vm.Script(query);
  filter = filter ? new vm.Script(filter) : null;

  let dirPath1 = path.resolve(getRoot(argv), directory1);
  let dirPath2 = path.resolve(getRoot(argv), directory2);

  let manifests = new Set((await fs.readdir(dirPath1)).filter(file => file.endsWith(".json")));
  let manifests2 = new Set((await fs.readdir(dirPath2)).filter(file => file.endsWith(".json")));

  if (includeMissing)
  {
    for (let entry of manifests2.values())
      manifests.add(entry);
  }
  else
  {
    for (let entry of [...manifests.values()])
      if (!manifests2.has(entry))
        manifests.delete(entry);
  }

  // Creating a context is expensive, share a context between calls
  let context = vm.createContext({});

  let count = 0;
  let total = 0;
  for (let entry of manifests.values())
  {
    let data1 = await readManifest(dirPath1, entry);
    let data2 = await readManifest(dirPath2, entry);

    let params = {
      metadata1: data1 ? data1.metadata : null,
      manifest1: data1 ? data1.manifest : null,
      metadata2: data2 ? data2.metadata : null,
      manifest2: data1 ? data1.manifest : null,
    };

    if (filter && !callScript(filter, context, params))
      continue;

    total++;
    if (!callScript(query, context, params))
      continue;

    count++;
    logger.logResult(path.basename(entry, ".json"), data2 ? data2.metadata : data1.metadata);
  }

  logger.logSummary(count, total);
}
