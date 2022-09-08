# Chrome Extension `manifest.json` Dataset (>10k Extensions)

This repository contains >10k [`manifest.json`](https://developer.chrome.com/extensions/manifest) files for extensions hosted in the [Chrome Web Store](https://chrome.google.com/webstore/category/extensions). These were collected via scraping Chrome Web Store. Some metadata has been added as front matter to the manifests in order to provide context: extension name and publisher, rating and user count.

This has been inspired by a [similar repository](https://github.com/mandatoryprogrammer/chrome-extension-manifests-dataset/) created by [@IAmMandatory](https://twitter.com/IAmMandatory). Captures for two points in time have been created but I cannot promise that any updates will happen in future. It's meant to be useful for analysis of the Chrome extension ecosystem, such as what permissions are requested, common Content Security Policies, etc.

## Querying the dataset

The repository contains a `query.js` script allowing running queries against the dataset. To run the script you will need Node.JS 16 or higher. Before using the script for the first time, run `npm install` command in this directory to install dependencies.

The script uses [matchme queries](https://github.com/DamonOehlman/matchme) and lists matching extensions. You can pass one or two queries on the command line:

```sh
query.js manifest-query [metadata-query]
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
query.js "content_security_policy =? /unsafe-eval/"
```

```sh
# List all extensions with less than 1.000 users using activeTab permission
query.js -m "user_count < 1000" "permissions =? /activeTab/"
```

```sh
# List all extensions requesting permissions for all websites (<all_urls>, *://*/* or https://*/* permissions)
./query.js "permissions =? /(<all_urls>|\*:\/\/\*\/\*|https:\/\/\*\/\*)/"
```
