import anthropicSvg from "@lobehub/icons-static-svg/icons/anthropic.svg?raw";
import deepseekSvg from "@lobehub/icons-static-svg/icons/deepseek-color.svg?raw";
import googleSvg from "@lobehub/icons-static-svg/icons/google-color.svg?raw";
import kimiSvg from "@lobehub/icons-static-svg/icons/kimi-color.svg?raw";
import metaSvg from "@lobehub/icons-static-svg/icons/meta-color.svg?raw";
import openaiSvg from "@lobehub/icons-static-svg/icons/openai.svg?raw";
import qwenSvg from "@lobehub/icons-static-svg/icons/qwen-color.svg?raw";
import xaiSvg from "@lobehub/icons-static-svg/icons/xai.svg?raw";
import zaiSvg from "@lobehub/icons-static-svg/icons/zai.svg?raw";

// A vendor mark is the model-facing brand mark, not always the vendor's
// corporate logo: Moonshot shows Kimi and Alibaba shows Qwen, matching the
// marks the DeepSWE site displays (see docs/context.md and ticket 16).
// The monochrome files (Anthropic, OpenAI, Z.ai, xAI) use currentColor and
// follow the theme; the -color files carry fixed brand colors legible on
// both themes. Keyed by the model mapping's vendor names.
export const vendorMarkSvgs: Record<string, string> = {
  Anthropic: anthropicSvg,
  OpenAI: openaiSvg,
  Google: googleSvg,
  DeepSeek: deepseekSvg,
  "Z.ai": zaiSvg,
  Moonshot: kimiSvg,
  Alibaba: qwenSvg,
  xAI: xaiSvg,
  Meta: metaSvg,
};
