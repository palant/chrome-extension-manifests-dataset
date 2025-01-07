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
  constructor(format)
  {
    this.fields = [];
    for (let field of format.split(","))
    {
      let current = [];
      for (let part of field.split("."))
      {
        part = part.trim();
        if (part)
          current.push(part);
      }
      this.fields.push(current);
    }
  }

  logResult(data)
  {
    let values = [];
    for (let field of this.fields)
    {
      let value = data;
      for (let part of field)
      {
        if (part != null)
        {
          if (part in value)
            value = value[part];
          else
            value = null;
        }
      }
      values.push(value);
    }
    console.log(...values);
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
    .option("descriptions", {
      alias: "r",
      type: "string",
      description: "Directory to load extension descriptions from",
    })
    .option("filter", {
      alias: "f",
      type: "string",
      description: "Filtering query to be applied to manifest and metadata, extensions not matching will be excluded from the total count",
    })
    .option("output-format", {
      alias: "o",
      type: "string",
      default: "id, metadata.name, metadata.user_count",
      description: "Extension fields to display in the output",
    })
    .positional("query", {
      description: "Query to be applied to manifest and metadata, matching extensions will be listed",
      type: "string",
    })
    .version(false)
    .demandCommand(1, 1)
    .argv;
}

export async function readManifest(dir, file, descriptionsDir)
{
  let id = path.basename(file, ".json");
  let entryPath = path.join(dir, file);
  let content;
  try
  {
    content = await fs.readFile(entryPath, {encoding: "utf-8"});
  }
  catch
  {
    return {id, metadata: null, manifest: null};
  }
  let parsed = parse(content);

  let metadata = parsed.data;
  if (typeof metadata.user_count == "string")
    metadata.user_count = parseInt(metadata.user_count.replace(/\D/g, ""), 10);

  let manifest = parsed.after[1];
  if (!manifest.trim())
    manifest = "{}";
  manifest = JSON.parse(manifest.replace(/\uFEFF/g, "").replace(/(?=\n|^)\s*\/\/[^\n]*/g, "").replace(/(?=\n|^)\s*\/\*.*?\*\//g, ""));

  let descriptions = null;
  if (descriptionsDir)
  {
    let descriptionsPath = path.join(descriptionsDir, `${id}.json`);
    let content = null;
    try
    {
      content = await fs.readFile(descriptionsPath, {encoding: "utf-8"});
    }
    catch
    {
      // Ignore missing description files
    }

    if (content)
    {
      descriptions = JSON.parse(content);

      // De-normalize languages
      for (let descriptionType of Object.keys(descriptions))
      {
        for (let language of Object.keys(descriptions[descriptionType]))
        {
          if (language.includes(","))
          {
            for (let part of language.split(","))
              descriptions[descriptionType][part] = descriptions[descriptionType][language];
            delete descriptions[descriptionType][language];
          }
        }
      }
    }
  }

  return {id, metadata, manifest, descriptions};
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
    _: [query],
    filter,
    directory,
    descriptions,
    outputFormat,
  } = await parseParams(argv);

  query = new vm.Script(query);
  filter = filter ? new vm.Script(filter) : null;
  logger = new logger(outputFormat);

  // Creating a context is expensive, share a context between calls
  let context = vm.createContext({});

  let dirPath = path.resolve(getRoot(argv), directory);
  let descriptionsDir = descriptions ? path.resolve(getRoot(argv), descriptions) : null;
  let count = 0;
  let total = 0;

  let files = (await fs.readdir(dirPath)).filter(entry => entry.endsWith(".json"));
  files.sort();
  for (let entry of files)
  {
    let data = await readManifest(dirPath, entry, descriptionsDir);
    if (filter && !callScript(filter, context, data))
      continue;

    total++;
    if (!callScript(query, context, data))
      continue;

    count++;
    logger.logResult(data);
  }

  logger.logSummary(count, total);
}
