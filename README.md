# Photo Review

An AI-powered desktop app for critiquing photographs. Drop in an image and get a detailed, structured review across 14 technical and artistic dimensions — with visual annotations highlighting specific areas of interest.

Built with **Tauri v2** (Rust backend) + **React + TypeScript** (Vite frontend).

---

## Installation

Install the application from the [dedicated website](https://astrabert.github.io/photo-review/) or from the [GitHub Releases Page](https://github.com/AstraBert/photo-review/releases/).

> [!NOTE]
>
> This app requires a GUI, and does not work on headless operating systems

### Installation Troubleshooting

**MacOS**

For macOS, you might run into problems while opening the app, as it is not signed (it would require an Apple Developer account, which I do not have), and it might be deemed corrupted.

In order to launch the app nevertheless, open the terminal and paste:

```bash
xattr -cr /Applications/photo-review.app
```

You will be prompted to approve the app to access you Mac's keychain, which is required to securely store your OpenAI API key.

**Windows**

> [!NOTE]
> The application is compiled only for Windows x86_64 (AMD arch). Newer ARM64 architectures are not supported.

The system might attempt to block the installation: in that case, you should click on **Advanced options** on the dialog that pops up, and then on **install anyways**.

While the installation wizard works, you might still be presented with a dialog asking you if you want the wizard to apply changes to your system: the changes simply consist of the installation of the app, so you can click "Yes" if you actually want to proceed.

From there, Windows should leave you alone.

---

## Features

- **Drag & drop** any image to analyze
- **14 scored dimensions** — from sharpness and exposure to emotional impact and color harmony
- **Visual annotations** — bounding boxes overlaid on the image pointing out specific issues or highlights
- **Secure API key storage** — your OpenAI key is saved in the system keyring, never stored in plain text
- **Cross-platform** — macOS (Intel & Apple Silicon), Windows, and Linux

---

## Scoring Dimensions

| Dimension | Description |
|-----------|-------------|
| **Overall** | Holistic judgement, not a simple average |
| **Sharpness & Focus** | Focus accuracy on the intended subject |
| **Exposure** | Highlight/shadow clipping, brightness balance |
| **Noise** | Grain levels relative to style and intent |
| **Color Accuracy** | White balance correctness, unwanted color casts |
| **Dynamic Range** | Detail retained in shadows and highlights |
| **Composition** | Framing, rule of thirds, leading lines, balance |
| **Background** | Separation from subject, clutter, distractions |
| **Cropping** | Tightness/looseness, awkward cuts |
| **Subject Clarity** | How clear and identifiable the focal point is |
| **Emotional Impact** | Mood and storytelling strength |
| **Moment & Timing** | Decisive moment, expression, action capture |
| **Lighting** | Direction, hardness/softness, modeling on subject |
| **Color Harmony** | Palette cohesion |
| **Post-Processing** | Naturalness, artifacts, over-processing |

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/)

### Setup

```bash
# Install dependencies
pnpm install

# Run in dev mode
pnpm tauri dev
```

### Build

```bash
# Build the production app
pnpm tauri build
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Backend | Tauri v2, Rust |
| AI | OpenAI GPT-5.4-mini (vision) via `llms-sdk` |
| Auth | System keyring (`keyring` crate) |
| CI/CD | GitHub Actions — builds for macOS, Windows, Linux |

---

## License

MIT
