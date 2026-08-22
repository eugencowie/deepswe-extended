import { defineConfig, mergeConfig, type UserConfig } from "vite-plus";

const baseConfig: UserConfig = {
  lint: { plugins: ["eslint", "typescript", "unicorn", "oxc"] },
};

const vitePlusConfig: UserConfig = {
  staged: { "*": "vp check --fix" },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
};

const projectConfig: UserConfig = {
  fmt: { ignorePatterns: ["docs/"] },
};

function defineMergedConfig(configs: UserConfig[]) {
  return defineConfig(configs.reduce((merged, next) => mergeConfig(merged, next), {}));
}

export default defineMergedConfig([baseConfig, vitePlusConfig, projectConfig]);
