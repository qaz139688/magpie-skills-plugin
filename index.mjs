import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_PORT } from "./lib/constants.mjs";
import { startSkillsService } from "./lib/service.mjs";

export { createService, startSkillsService } from "./lib/service.mjs";
export { parseAgentList } from "./lib/discovery.mjs";
export {
  createLabel,
  deleteLabel,
  loadMetadata,
  renameLabel,
  saveMetadata,
  setSkillLabels
} from "./lib/metadata.mjs";

export default {
  id: "magpie-skills-manager",
  async server(_input, options = {}) {
    const port = Number(options.port) || DEFAULT_PORT;
    startSkillsService({
      port,
      pluginDir: path.dirname(fileURLToPath(import.meta.url))
    });
    return {};
  }
};
