import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_PORT } from "./lib/constants.mjs";
import { startOrReuseSkillsService } from "./lib/service.mjs";

export default {
  id: "magpie-skills-manager",
  async server(input = {}, options = {}) {
    const port = Number(options.port) || DEFAULT_PORT;
    await startOrReuseSkillsService({
      port,
      configDir: input.directory || process.cwd(),
      pluginDir: path.dirname(fileURLToPath(import.meta.url))
    });
    return {};
  }
};
