import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Team policy: reference/close issues ONLY in PR descriptions, not in commits
    // This enforces that commit messages contain no issue references (e.g. #123)
    'references-empty': [2, 'always'],
  },
};

export default config;
