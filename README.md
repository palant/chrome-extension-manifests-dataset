# Chrome Extension `manifest.json` Dataset (>100k Extensions)

This repository contains >100k [`manifest.json`](https://developer.chrome.com/extensions/manifest) files for extensions hosted in the [Chrome Web Store](https://chromewebstore.google.com/). These were collected via scraping Chrome Web Store. Some metadata has been added as front matter to the manifests in order to provide context, e.g. extension name and publisher, rating and user count.

Note that the scraping approach changed with the 2023-06-01 and 2023-11-29 snapshots. With the 2023-06-01 snapshot, the number of manifests increased from 10k to >50k, and with the  2023-11-29 snapshot to >100k. The latter also changed metadata in various ways, e.g.: user counts beyond 10,000,000 are possible, release dates are in ISO format, `slug` field is gone and category is only indicated by the `category_slug` field without the human-readable `category` field.

This has been inspired by a [similar repository](https://github.com/mandatoryprogrammer/chrome-extension-manifests-dataset/) created by [@IAmMandatory](https://infosec.exchange/@mandatory). Captures for a bunch of points in time have been created but I cannot promise that any updates will happen in future. It's meant to be useful for analysis of the Chrome extension ecosystem, such as what permissions are requested, common Content Security Policies, etc.

## Convenience scripts

The repository contains two convenience scripts, `query.js` and `compare.js`. The former allows listing extensions of a snapshot matching specified criteria, the latter will compare two snapshots and list matching extensions. Both scripts will explain their command line parameters if run without parameters. The following explains the concepts used by these scripts.

### “Current” snapshot

The “current” snapshot directory is determined by the contents of the `current_dir` file. Usually, it will be the latest snapshot in the repository.

By default, `query.js` will list extensions from the current snapshot. `compare.js` will use that directory as its second source directory, with the first source directory by default being the snapshot preceding the current snapshot.

It is always possible to use a different source directory. With `query.js`, the relevant parameter is `--directory`. With `compare.js`, the parameters are `--directory1` and `--directory2`.

### The queries

The queries are JavaScript code that will be executed in a sandbox. The context will contain information on the current extension, allowing the script to make a decision. With `query.js` script, that context contains `metadata` and `manifest` variables. With `compare.js` script, there are four context variables: `metadata1`, `manifest1`, `metadata2`, `manifest2`. These represent the data of the current extension from the first and the second source directory respectively.

When `compare.js` script is run with the `-i` parameter, the queries may receive data of extensions only present in one of the source directories. In this case, two of the context variables will be `null`.

Only extensions will be listed where the query returns a true-ish value. In additional to the regular query, it is possible to pass a filtering query. The filtering query is executed in the same fashion, however failing the query has the effect that the extension is excluded from the total count in the statistic displayed.

### Example calls

```sh
# List all Manifest V3 extensions
query.js "manifest.manifest_version == 3"
```

```sh
# List extensions with at least 10.000 users using Manifest V3
query.js -f "metadata.user_count >= 10000" "manifest.manifest_version == 3"
```

```sh
# List all extensions using 'unsafe-eval' Content Security Policy
query.js "/unsafe-eval/i.test(manifest.content_security_policy?.extension_pages || manifest.content_security_policy)"
```

```sh
# List extensions with less than 1.000 users using activeTab permission
query.js -f "metadata.user_count < 1000" "[manifest.permissions].flat().includes('activeTab')"
```

```sh
# List all extensions requesting permissions for all websites (<all_urls>,
# *://*/* or https://*/* permissions)
query.js "[manifest.host_permissions, manifest.permissions].flat().some(permission => ['<all_urls>', '*://*/*', 'https://*/*'].includes(permission))"
```

```sh
# List popular extensions that changed their name recently
compare.js -f "metadata2.user_count >= 1000000" "metadata1.name != metadata2.name"
```

```sh
# List popular extensions more than doubling their previous user count
compare.js -f "metadata2.user_count >= 1000000" "metadata1.user_count * 2 < metadata2.user_count"
```

```sh
# List new extensions with a high user count
compare.js -i -f "metadata1 == null" "metadata2.user_count >= 100000"
```

### Script output example

```sh
$ query.js -f "metadata.user_count >= 10000000" "/unsafe-eval/i.test(manifest.content_security_policy?.extension_pages || manifest.content_security_policy)"
aapbdbdomjkkjkaonfhkkikfgjllcleb Google Translate 38000000
fheoggkfdfchfphceeifdbepaooicaho McAfee® WebAdvisor 82000000
hdokiejnpimakedhajhdlcegeplioahd LastPass: Free Password Manager 10000000
mmeijimgabbpbgpdklnllpncmdofkcpn Screencastify - Screen Video Recorder 12000000
nkbihfbeogaeaoehlefnkodbefgpgknn MetaMask 16000000
Matched 5 out of 31 manifests (16.13%).
```
