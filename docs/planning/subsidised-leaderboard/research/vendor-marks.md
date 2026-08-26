# Vendor mark sources

Researched on 2026-08-26 against the nine vendors in
[`data/model-mapping.json`](../../../../data/model-mapping.json).

## Recommendation

Use `@lobehub/icons-static-svg@1.94.0`. It is the only checked package that
covers every vendor with the model-facing marks shown in the reference UI.
The package contains plain SVG files, declares no runtime dependencies or peer
dependencies, and is 2.3 MB unpacked across 905 files. The selected nine files
total only 14.7 KB before build-time compression. Pin the package version so an
upstream logo change is reviewed rather than silently shipped.
[Static package manifest](https://github.com/lobehub/lobe-icons/blob/fbd2d56e3f734e889f1373e71c8368cc4e60e0d7/packages/static-svg/package.json),
[npm release](https://www.npmjs.com/package/@lobehub/icons-static-svg/v/1.94.0),
[release commit](https://github.com/lobehub/lobe-icons/commit/fbd2d56e3f734e889f1373e71c8368cc4e60e0d7)

Use these assets:

| Mapping vendor | UI mark | Static SVG | Optional React export | Other useful variants |
|---|---|---|---|---|
| Anthropic | Anthropic | [`anthropic.svg`](https://github.com/lobehub/lobe-icons/blob/fbd2d56e3f734e889f1373e71c8368cc4e60e0d7/packages/static-svg/icons/anthropic.svg) | `Anthropic` | `anthropic-text.svg` |
| OpenAI | OpenAI | [`openai.svg`](https://github.com/lobehub/lobe-icons/blob/fbd2d56e3f734e889f1373e71c8368cc4e60e0d7/packages/static-svg/icons/openai.svg) | `OpenAI` | `openai-text.svg` |
| Google | Google | [`google-color.svg`](https://github.com/lobehub/lobe-icons/blob/fbd2d56e3f734e889f1373e71c8368cc4e60e0d7/packages/static-svg/icons/google-color.svg) | `Google.Color` | `google.svg`, `gemini.svg`, `gemini-color.svg` |
| DeepSeek | DeepSeek | [`deepseek-color.svg`](https://github.com/lobehub/lobe-icons/blob/fbd2d56e3f734e889f1373e71c8368cc4e60e0d7/packages/static-svg/icons/deepseek-color.svg) | `DeepSeek.Color` | `deepseek.svg` |
| Z.ai | Z.ai | [`zai.svg`](https://github.com/lobehub/lobe-icons/blob/fbd2d56e3f734e889f1373e71c8368cc4e60e0d7/packages/static-svg/icons/zai.svg) | `ZAI` | `zhipu-color.svg`, `chatglm-color.svg` |
| Moonshot | Kimi | [`kimi-color.svg`](https://github.com/lobehub/lobe-icons/blob/fbd2d56e3f734e889f1373e71c8368cc4e60e0d7/packages/static-svg/icons/kimi-color.svg) | `Kimi.Color` | `kimi.svg`, `moonshot.svg` |
| Alibaba | Qwen | [`qwen-color.svg`](https://github.com/lobehub/lobe-icons/blob/fbd2d56e3f734e889f1373e71c8368cc4e60e0d7/packages/static-svg/icons/qwen-color.svg) | `Qwen.Color` | `qwen.svg`, `alibaba-color.svg` |
| xAI | xAI | [`xai.svg`](https://github.com/lobehub/lobe-icons/blob/fbd2d56e3f734e889f1373e71c8368cc4e60e0d7/packages/static-svg/icons/xai.svg) | `XAI` | `grok.svg` |
| Meta | Meta | [`meta-color.svg`](https://github.com/lobehub/lobe-icons/blob/fbd2d56e3f734e889f1373e71c8368cc4e60e0d7/packages/static-svg/icons/meta-color.svg) | `Meta.Color` | `meta.svg`, `meta-brand-color.svg` |

This mapping deliberately uses Kimi and Qwen rather than the Moonshot and
Alibaba corporate marks because those are the marks visible beside the model
families in the reference UI. Lobe also supplies the corporate alternatives.
The [release asset directory](https://github.com/lobehub/lobe-icons/tree/fbd2d56e3f734e889f1373e71c8368cc4e60e0d7/packages/static-svg/icons)
contains every path above.

The unqualified SVGs are monochrome and use `currentColor`; the `-color` files
contain fixed brand colors or gradients. An SVG loaded through an `<img>` does
not inherit the surrounding element's CSS `color`, so the monochrome files
need a dark-mode strategy such as a CSS mask, an invert filter, or inline SVG.
Do not use an unversioned CDN `latest` URL. An installed, pinned package lets
Vite fingerprint and serve only the imported assets.

## Why not the React package

`@lobehub/icons@5.16.0` also has all nine named exports: `Anthropic`, `OpenAI`,
`Google`, `Gemini`, `DeepSeek`, `ZAI`, `Kimi`, `Moonshot`, `Qwen`, `Alibaba`,
`XAI`, `Grok`, and `Meta`. Most exports are compounded components. Their
default is a monochrome inline SVG, while properties such as `.Color`,
`.Avatar`, `.Text`, and `.Combine` vary by brand.
[Named exports](https://github.com/lobehub/lobe-icons/blob/v5.16.0/src/icons.ts),
[component example](https://github.com/lobehub/lobe-icons/blob/v5.16.0/src/DeepSeek/index.ts)

The package marks itself as tree-shakable, but it brings more installation and
upgrade risk than this small feature needs. Version 5.16.0 declares
`@lobehub/ui`, Ant Design, React, and React DOM as peers, plus four runtime
dependencies. This repo already satisfies the React 19 peers but does not use
`@lobehub/ui` or Ant Design. The package is 9.0 MB unpacked across 4,787 files.
Use it only if inline SVG color inheritance and the supplied React API justify
those extra dependencies.
[React package manifest](https://github.com/lobehub/lobe-icons/blob/v5.16.0/package.json),
[npm release](https://www.npmjs.com/package/@lobehub/icons/v/5.16.0)

## Simple Icons and its icon font

`simple-icons@16.28.0` is well maintained and dependency-free. It publishes
raw SVGs, JavaScript icon objects, TypeScript declarations, per-icon deep
imports, brand hex values, source links, and a tree-shakable ESM entry point.
The companion `simple-icons-font@16.28.0` exposes the same catalog as an icon
font. Both releases were published on 2026-08-02; Simple Icons says it normally
releases updates weekly.
[package usage](https://github.com/simple-icons/simple-icons/blob/c956d67dfa7c37ae65206fc0775b0c02d1e695c2/README.md#node-usage),
[package manifest](https://github.com/simple-icons/simple-icons/blob/c956d67dfa7c37ae65206fc0775b0c02d1e695c2/package.json),
[16.28.0 release](https://github.com/simple-icons/simple-icons/commit/c956d67dfa7c37ae65206fc0775b0c02d1e695c2),
[font release](https://github.com/simple-icons/simple-icons-font/commit/a72995e53f995fc5c35d93c0ec978b652e8a2f32)

It is not a one-source solution for this leaderboard. The audited release has
seven of the nine desired marks:

| Desired mark | SVG slug / JavaScript export | Result |
|---|---|---|
| Anthropic | `anthropic` / `siAnthropic` | Present |
| OpenAI | none | Missing |
| Google or Gemini | `google`, `googlegemini` / `siGoogle`, `siGooglegemini` | Present |
| DeepSeek | `deepseek` / `siDeepseek` | Present |
| Z.ai | `zdotai` / `siZdotai` | Present |
| Kimi or Moonshot | `kimi`, `moonshotai` / `siKimi`, `siMoonshotai` | Present |
| Qwen | `qwen` / `siQwen` | Present |
| xAI or Grok | none | Missing. The catalog's `x` icon is X, the social network, not xAI. |
| Meta | `meta` / `siMeta` | Present |

The exact release tree confirms those files and the two gaps.
[16.28.0 SVG directory](https://github.com/simple-icons/simple-icons/tree/c956d67dfa7c37ae65206fc0775b0c02d1e695c2/icons),
[catalog metadata](https://github.com/simple-icons/simple-icons/blob/c956d67dfa7c37ae65206fc0775b0c02d1e695c2/data/simple-icons.json)

Simple Icons paths are single-color. Its `hex` field or the font's
`.si--color` class chooses one brand color, but neither can reproduce the
multicolor Google G or gradients in Gemini, Qwen, and Meta. The font is also a
large delivery for nine glyphs: its smallest standard WOFF2 is about 817 KB,
and the CSS is about 283 KB minified. Lobe's nine selected SVGs are roughly
15 KB in source form. The font therefore loses both coverage and payload size
for this use case.

## License and trademark limits

The package license is not permission to use every vendor's trademark.
Lobe's code and generated files are MIT licensed, but its repository does not
publish per-icon provenance or trademark permissions. Simple Icons is CC0,
yet its own disclaimer says that CC0 does not imply every included icon is
CC0, asks users to follow each brand's guidelines, and tells users to obtain
the required permissions.
[Lobe MIT license](https://github.com/lobehub/lobe-icons/blob/v5.16.0/LICENSE),
[Simple Icons disclaimer](https://github.com/simple-icons/simple-icons/blob/c956d67dfa7c37ae65206fc0775b0c02d1e695c2/DISCLAIMER.md),
[Simple Icons CC0 license](https://github.com/simple-icons/simple-icons/blob/c956d67dfa7c37ae65206fc0775b0c02d1e695c2/LICENSE.md)

The first-party terms are not uniform:

- OpenAI provides downloadable logo files but says to use the logo exactly as
  provided, only when it directly relates to OpenAI services, and without
  implying endorsement. [OpenAI design guidelines](https://openai.com/brand/)
- Google says not to imply affiliation, endorsement, or sponsorship and points
  users to product-icon and general trademark rules. [Google Brand Resource
  Center](https://about.google/brand-resource-center/guidance/)
- DeepSeek's current terms say its logos and other prominent brand features
  may not be used without permission. [DeepSeek terms, section
  6.2](https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html)
- Kimi publishes first-party SVG and PNG downloads for light and dark
  backgrounds. [Kimi brand guidelines](https://moonshotai.github.io/Branding-Guide/)
- Qwen's terms identify Qwen and its logos as Alibaba trademarks and prohibit
  unauthorized copying, modification, use, or publication. [Qwen terms,
  section V](https://qwen.ai/termsservice)
- xAI supplies logo downloads, permits accurate references, forbids implied
  endorsement, and requires the downloaded logos to be used exactly as
  provided. [xAI brand guidelines](https://x.ai/legal/brand-guidelines)
- Meta publishes a company-brand resource linked by the Simple Icons catalog.
  [Meta company brand resource](https://about.meta.com/brand/resources/meta/company-brand/)
- Z.ai hosts the logo used as Simple Icons' source on its own CDN. [Official
  Z.ai SVG](https://z-cdn.chatglm.cn/z-ai/static/logo.svg)

No public Anthropic logo-use guide or download page was found in Anthropic's
official site during this research. Treat its logo as a trademark and use it
only as a neutral vendor identifier pending legal review, rather than
assuming Lobe's MIT license grants brand rights.

For implementation, keep the icons small and secondary to the model names,
add accessible vendor text independently of the SVG `<title>`, do not alter
logo geometry, and avoid any surrounding copy that suggests sponsorship.
