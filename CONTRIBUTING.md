# Contributing

This module is under the MIT license and is accepting merge requests and issue reports. Feel free to submit improvements to the module, and I'll review them and merge them if they seem useful for the module.

## How to use the system locally

With the change to LevelDB, there is an extra step to create the packs locally.

- Clone the repository as usual
- You need to have a node.js installation done
- run `npm install`: will generate the node_modules depending on package.json and package-lock.json
- then `npm run build` to build once or `npm run watch` to have a SCSS watcher running to update the CSS when SCSS is updated automatically.
- If you want Foundry to hot-reload pages as you make updates, you will need to launch Foundry with the `--hotReload` flag. See [Using Command Line Flags](https://foundryvtt.com/article/configuration/)
- To save the compendiums to JSON for better version control (and go from JSON to LevelDB):
    - You must be in the Foundry welcome page (or have it completely closed) and NOT in a world you want to convert compendium from. 
    - To convert JSON to LevelDB after a fresh pull from git or manually editing the JSON file: In the system directory use `npm run pullJSONtoLDB` will create the packs depending of the content of src/packs directory
    - To convert LevelDB to JSON after making changes to compendiums in Foundry: In the system directory use `npm run pushLDBtoJSON` will create JSON in the src/packs folder, then you can push your updates upstream.

# To update the packs
Make sure Foundry is not running first.
-  LDB to JSON for syncing to git : `npm run pushLDBtoJSON` will create the src/packs files and export all actors/items in json files
-  JSON to LDB for testing locally : `npm run pullJSONtoLDB` will create the LevelDB folders from the JSON files in the src/packs folder
