#!/usr/bin/env node

/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import path from "node:path";
import fs from "node:fs/promises";

import frontmatter from "frontmatter";
import matchme from "matchme";
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

function getRoot(argv)
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

export async function doQuery(argv, logger)
{
  let {
    _: [manifest],
    metadata,
    directory,
  } = await parseParams(argv);

  manifest = matchme.filter(manifest);
  metadata = metadata ? matchme.filter(metadata) : null;

  let dirpath = path.resolve(getRoot(argv), directory);
  let count = 0;
  let total = 0;
  for await (let entry of await fs.opendir(dirpath))
  {
    if (!entry.name.endsWith(".json"))
      continue;

    let entrypath = path.join(dirpath, entry.name);
    let content = await fs.readFile(entrypath, {encoding: "utf-8"});
    let parsed = frontmatter(content, {
      safeLoad: true,
    });

    if (!parsed.content.trim())
      parsed.content = "{}";
    if (typeof parsed.data.user_count == "string")
      parsed.data.user_count = parseInt(parsed.data.user_count.replace(/\D/g, ""), 10);

    if (metadata && !metadata(parsed.data))
      continue;

    total++;
    if (!manifest(JSON.parse(parsed.content.replace(/\uFEFF/g, ""))))
      continue;

    count++;
    logger.logResult(path.basename(entry.name, ".json"), parsed.data);
  }

  logger.logSummary(count, total);
}
