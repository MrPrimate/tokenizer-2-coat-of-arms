/* eslint-disable no-sync */
/* eslint-disable no-process-env */
// Prints the release module.json: module-template.json with the version from
// package.json and the GitHub repository the release is published to
// (GITHUB_REPOSITORY in Actions).
import fs from "fs";
import process from "process";

const readJson = (file) => JSON.parse(fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"));

const { version } = readJson("package.json");
const repository = process.env.GITHUB_REPOSITORY || "MrPrimate/tokenizer-2-coat-of-arms";
const fill = (url) => url.replaceAll("VERSION", version).replaceAll("REPOSITORY", repository);

const mod = readJson("module-template.json");
mod.version = version;
mod.download = fill(mod.download);
mod.manifest = fill(mod.manifest);

process.stdout.write(`${JSON.stringify(mod, null, 2)}\n`);
