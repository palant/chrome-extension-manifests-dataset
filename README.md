# Chrome Extension `manifest.json` Dataset (>100k Extensions)

This repository contains >100k [`manifest.json`](https://developer.chrome.com/extensions/manifest) files for extensions hosted in the [Chrome Web Store](https://chromewebstore.google.com/). These were collected via scraping Chrome Web Store. Some metadata has been added as front matter to the manifests in order to provide context, e.g. extension name and publisher, rating and user count.

This has been inspired by a [similar repository](https://github.com/mandatoryprogrammer/chrome-extension-manifests-dataset/) created by [@IAmMandatory](https://infosec.exchange/@mandatory). Captures for a bunch of points in time have been created but I cannot promise that any updates will happen in future. It's meant to be useful for analysis of the Chrome extension ecosystem, such as what permissions are requested, common Content Security Policies, etc.

## Change history

* 2023-06-01
  * Changed scraping approach, increased number of manifests from 10k to >50k
* 2023-11-29
  * Changed scraping approach, increased number of manifests to >100k
  * `user_count` field is now numerical rather than a formatted string, values beyond 10,000,000 are now possible
  * `release_date` field is in ISO format now
  * `slug` field has been removed, it can be deduced from `name` field
  * `category` field has been removed, `category_slug` field can be used instead
* 2024-09-28
  * Changed scraping approach, increased number of manifests to >120k
* 2024-12-13
  * Descriptions in various languages have been scraped (experimental), these are stored in a separate directory
* 2025-01-10
  * Added boolean `featured` field
  * Added `creation_date` field in ISO format
  * Added `publisher_hash` field (non-reversible HMAC hash of the publisher’s email address, can be used to identify extensions belonging to the same account)
  * Added `publisher_phone` field
  * Added boolean `extension_website_verified` field

## Convenience scripts

The repository contains two convenience scripts, `query.js` and `compare.js`. The former allows listing extensions of a snapshot matching specified criteria, the latter will compare two snapshots and list matching extensions. Both scripts will explain their command line parameters if run without parameters. The following explains the concepts used by these scripts.

### “Current” snapshot

The “current” snapshot directory is determined by the contents of the `current_dir` file. Usually, it will be the latest snapshot in the repository.

By default, `query.js` will list extensions from the current snapshot. `compare.js` will use that directory as its second source directory, with the first source directory by default being the snapshot preceding the current snapshot.

It is always possible to use a different source directory. With `query.js`, the relevant parameter is `--directory`. With `compare.js`, the parameters are `--directory1` and `--directory2`.

### The queries

The queries are JavaScript code that will be executed in a sandbox. The context will contain information on the current extension, allowing the script to make a decision. With `query.js` script, that context contains `id`, `metadata` and `manifest` variables. With `compare.js` script, there are five context variables: `id`, `metadata1`, `manifest1`, `metadata2`, `manifest2`. These represent the data of the current extension from the first and the second source directory respectively.

When `compare.js` script is run with the `-i` parameter, the queries may receive data of extensions only present in one of the source directories. In this case, either `metadata1` and `manifest1` will be `null` (extension not present in the first source directory) or `metadata2` and `manifest2` (extension not present in the second source directory).

Only extensions will be listed where the query returns a true-ish value. In additional to the regular query, it is possible to pass a filtering query. The filtering query is executed in the same fashion, however failing the query has the effect that the extension is excluded from the total count in the statistic displayed.

If the `-r` parameter is given, the `query.js` script will also attempt to load extension descriptions from the respective directory and expose them (if present) as `descriptions` context variable. Unlike the data files, this variable contains each language as a separate key rather than combining languages with identical descriptions in a single key.

### Output format

By default, the scripts will list the extension ID, name and user count in their output. This can be customized by passing a comma-separated list of fields via the `-o` parameter, e.g.:

```sh
query.js -o "id, metadata.name, manifest.permissions" true
```

Instead of listing user count, this query will list the requested permissions of all extensions.

Note that field definitions apply to the same context as the queries but aren’t evaluated as JavaScript code. They are rather treated as a dot-separated list of property names. So the proper way of referencing the first permission in the list is `manifest.permissions.0`.

This is what the default output looks like:

```sh
$ query.js \
  -f "metadata.user_count >= 10000000" \
  "/unsafe-eval/i.test(manifest.content_security_policy?.extension_pages || manifest.content_security_policy)"
aapbdbdomjkkjkaonfhkkikfgjllcleb Google Translate 38000000
fheoggkfdfchfphceeifdbepaooicaho McAfee® WebAdvisor 82000000
hdokiejnpimakedhajhdlcegeplioahd LastPass: Free Password Manager 10000000
mmeijimgabbpbgpdklnllpncmdofkcpn Screencastify - Screen Video Recorder 12000000
nkbihfbeogaeaoehlefnkodbefgpgknn MetaMask 16000000
Matched 5 out of 31 manifests (16.13%).
```

And the same query with a custom output format:

```sh
$ query.js \
  -o "id, metadata.name, metadata.release_date, metadata.rating, manifest.manifest_version" \
  -f "metadata.user_count >= 10000000" "/unsafe-eval/i.test(manifest.content_security_policy?.extension_pages || manifest.content_security_policy)"
aapbdbdomjkkjkaonfhkkikfgjllcleb Google Translate 2023-03-22T10:16:42.000Z 4.334249213282607 2
fheoggkfdfchfphceeifdbepaooicaho McAfee® WebAdvisor 2024-01-12T05:41:10.000Z 4.565129151291513 3
hdokiejnpimakedhajhdlcegeplioahd LastPass: Free Password Manager 2023-12-15T18:24:57.000Z 4.349355259345117 2
mmeijimgabbpbgpdklnllpncmdofkcpn Screencastify - Screen Video Recorder 2023-12-01T15:33:04.000Z 3.976567884217781 2
nkbihfbeogaeaoehlefnkodbefgpgknn MetaMask 2024-01-03T19:06:01.000Z 3.1609870740305523 2
Matched 5 out of 31 manifests (16.13%).
```


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
# List popular extensions that changed their name recently, display both old
# and new name
compare.js \
  -o "id, metadata1.name, metadata1.user_count, metadata2.name, metadata2.user_count" \
  -f "metadata2.user_count >= 1000000" "metadata1.name != metadata2.name"
```

```sh
# List popular extensions more than doubling their previous user count, display
# both old and new user count
compare.js \
  -o "id, metadata2.name, metadata1.user_count, metadata2.user_count" \
  -f "metadata2.user_count >= 1000000" "metadata1.user_count * 2 < metadata2.user_count"
```

```sh
# List new extensions with a high user count
compare.js -i -f "metadata1 == null" "metadata2.user_count >= 100000"
```
