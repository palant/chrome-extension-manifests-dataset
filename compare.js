#!/usr/bin/env node

/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import process from "node:process";

import {doQuery, DefaultLogger} from "./lib/compare.js";

doQuery(process.argv, new DefaultLogger());
