# Chrome Extension `manifest.json` Dataset (>100k Extensions)

This repository contains >100k [`manifest.json`](https://developer.chrome.com/extensions/manifest) files for extensions hosted in the [Chrome Web Store](https://chromewebstore.google.com/). These were collected via scraping Chrome Web Store. Some metadata has been added as front matter to the manifests in order to provide context, e.g. extension name and publisher, rating and user count.

Note that the scraping approach changed with the 2023-06-01 and 2023-11-29 snapshots. With the 2023-06-01 snapshot, the number of manifests increased from 10k to >50k, and with the  2023-11-29 snapshot to >100k. The latter also changed metadata in various ways, e.g.: user counts beyond 10,000,000 are possible, release dates are in ISO format, `slug` field is gone and category is only indicated by the `category_slug` field without the human-readable `category` field.

This has been inspired by a [similar repository](https://github.com/mandatoryprogrammer/chrome-extension-manifests-dataset/) created by [@IAmMandatory](https://infosec.exchange/@mandatory). Captures for a bunch of points in time have been created but I cannot promise that any updates will happen in future. It's meant to be useful for analysis of the Chrome extension ecosystem, such as what permissions are requested, common Content Security Policies, etc.

## Querying the dataset

The convenience script `query.js` in this repository allows running queries against the dataset. To run the script you will need Node.JS 16 or higher. Before using the script for the first time, run `npm install` command in this directory to install dependencies.

The queries are JavaScript code that will be executed sandboxed, with extension metadata/manifest as context. You can pass a manifest query and optionally a metadata query on the command line:

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
query.js "this.content_security_policy && /unsafe-eval/i.test(content_security_policy.extension_pages || content_security_policy)"
```

```sh
# List all extensions with less than 1.000 users using activeTab permission
query.js -m "user_count < 1000" "[this.permissions].flat().includes('activeTab')"
```

```sh
# List all extensions requesting permissions for all websites (<all_urls>,
# *://*/* or https://*/* permissions)
query.js "[this.host_permissions, this.permissions].flat().some(permission => ['<all_urls>', '*://*/*', 'https://*/*'].includes(permission))"
```

Results example:
```sh
$ query.js -m "user_count >= 10000000" "this.content_security_policy && /unsafe-eval/i.test(content_security_policy.extension_pages || content_security_policy)"
aapbdbdomjkkjkaonfhkkikfgjllcleb Google Translate 38000000
fheoggkfdfchfphceeifdbepaooicaho McAfee® WebAdvisor 82000000
hdokiejnpimakedhajhdlcegeplioahd LastPass: Free Password Manager 10000000
mmeijimgabbpbgpdklnllpncmdofkcpn Screencastify - Screen Video Recorder 12000000
nkbihfbeogaeaoehlefnkodbefgpgknn MetaMask 16000000
Matched 5 out of 31 manifests (16.13%).
```

## Comparing datasets

The convenience script `compare.js` in this repository allows comparing extension data between two datasets. To run the script you will need Node.JS 16 or higher. Before using the script for the first time, run `npm install` command in this directory to install dependencies.

The query is JavaScript code that will be executed sandboxed, with four variables as context: `metadata1`, `manifest1`, `metadata2`, `manifest2`. The variables `metadata1` and `manifest1` will be set to the extension’s metadata/manifest in the first directory, `metadata2` and `manifest2` to the same extension’s metadata/manifest in the second directory. By default, the second directory is the current dataset and the first directory the dataset preceding it.

By passing `-i` command line option, extensions missing from one of the directories can be included in the comparison. The context variables for the directory where the extension is missing will be set to `null` then.

Examples:

```sh
# List popular extensions that changed their name recently
compare.js "metadata2.user_count >= 1000000 && metadata1.name != metadata2.name"
```

```sh
# List popular extensions more than doubling their previous user count
compare.js "metadata2.user_count >= 1000000 && metadata1.user_count * 2 < metadata2.user_count"
```

```sh
# List new extensions with a high user count
compare.js -i "metadata1 == null && metadata2.user_count >= 100000"
```
