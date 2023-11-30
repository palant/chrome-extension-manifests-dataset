# Chrome Extension `manifest.json` Dataset (>50k Extensions)

This repository contains >50k [`manifest.json`](https://developer.chrome.com/extensions/manifest) files for extensions hosted in the [Chrome Web Store](https://chrome.google.com/webstore/category/extensions). These were collected via scraping Chrome Web Store. Some metadata has been added as front matter to the manifests in order to provide context, e.g. extension name and publisher, rating and user count.

Note that the scraping approach changed with the 2023-06-01 snapshot. Earlier snapshots contain a considerably lower number of manifests, around 10k. Another change happened with the 2023-11-29 snapshot affecting metadata, e.g.: user counts beyond 10,000,000 are possible, release dates are in ISO format, `slug` field is gone and category is only indicated by the `category_slug` field without the human-readable `category` field.

This has been inspired by a [similar repository](https://github.com/mandatoryprogrammer/chrome-extension-manifests-dataset/) created by [@IAmMandatory](https://infosec.exchange/@mandatory). Captures for a bunch of points in time have been created but I cannot promise that any updates will happen in future. It's meant to be useful for analysis of the Chrome extension ecosystem, such as what permissions are requested, common Content Security Policies, etc.

## Querying the dataset

The repository contains a `query.js` script allowing running queries against the dataset. To run the script you will need Node.JS 16 or higher. Before using the script for the first time, run `npm install` command in this directory to install dependencies.

The script uses [matchme queries](https://github.com/DamonOehlman/matchme) and lists matching extensions. You can pass a manifest query and optionally a metadata query on the command line:

```sh
query.js [-m metadata-query] manifest-query
```

Examples:

```sh
# List all Manifest V3 extensions
query.js "manifest_version == 3"
```

```sh
# List all Manifest V3 extensions with at least 10.000 users
query.js -m "user_count >= 10000" "manifest_version == 3"
```

```sh
# List all extensions using 'unsafe-eval' Content Security Policy
query.js "content_security_policy =? /unsafe-eval/i || content_security_policy.extension_pages =? /unsafe-eval/i"
```

```sh
# List all extensions with less than 1.000 users using activeTab permission
query.js -m "user_count < 1000" "permissions =? /activeTab/i"
```

```sh
# List all extensions requesting permissions for all websites (<all_urls>,
# *://*/* or https://*/* permissions)
query.js "permissions =? /(<all_urls>|\*:\/\/\*\/\*|https:\/\/\*\/\*)/i || host_permissions =? /(<all_urls>|\*:\/\/\*\/\*|https:\/\/\*\/\*)/i"
```
