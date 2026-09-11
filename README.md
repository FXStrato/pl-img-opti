# pl-img-opti

A client-side image optimization web application built with React, Vite, and Cloudflare Workers. Optimize SVG, PNG, and JPEG files directly in your browser with no server-side processing.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/vite-react-template)

## Features

- **Client-Side Processing**: All image optimization happens in your browser using Web Workers
- **Multi-Format Support**: Optimize SVG, PNG, and JPEG files
- **Quality Presets**: Choose between Lossless, Balanced, and Aggressive optimization
- **Batch Processing**: Upload multiple files and process them sequentially
- **Progress Tracking**: Real-time status and progress for each file
- **Flexible Downloads**: Download individual files or all optimized images as a ZIP
- **Accessible**: Fully keyboard-navigable with screen reader support

## How It Works

### Optimization Codecs

- **SVG**: [SVGO v4](https://github.com/svg/svgo) via browser bundle
- **JPEG**: [@jsquash/jpeg](https://github.com/jSquash/jpeg) (MozJPEG via WASM)
- **PNG**: [@jsquash/png](https://github.com/jSquash/png) and [@jsquash/oxipng](https://github.com/jSquash/oxipng) (OxiPNG via WASM)
- **ZIP**: [fflate](https://github.com/101arrowz/fflate) for multi-file downloads

### Quality Preset Mapping

| Preset      | SVG                        | PNG                          | JPEG                  |
|-------------|----------------------------|------------------------------|-----------------------|
| Lossless    | Basic minification         | PNG encode + OxiPNG level 1  | High quality (q=95) † |
| Balanced    | Standard optimization      | PNG encode + OxiPNG level 2  | Medium quality (q=80) |
| Aggressive  | Maximum minification       | PNG encode + OxiPNG level 3  | Lower quality (q=65)  |

**†** "Lossless" for JPEG means high-quality MozJPEG encoding (q≈95), not mathematically lossless compression. JPEG is inherently a lossy format; this preset minimizes quality loss while reducing file size.

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Your application will be available at [http://localhost:5173](http://localhost:5173).

### Production Build

Build the project:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Deploy to Cloudflare Workers

Deploy to Cloudflare's global network:

```bash
npm run build && npm run deploy
```

The application is configured as a Single Page Application (SPA) that serves from Cloudflare Workers Assets. The Worker itself is minimal (see `src/worker/index.ts`) - all image processing happens client-side.

## Usage

1. **Upload Images**: Drag and drop files onto the dropzone, or click to browse
2. **Select Quality**: Choose a preset (Lossless, Balanced, or Aggressive)
3. **Watch Progress**: Each file shows its status and optimization progress
4. **Download**: Click the download icon for individual files, or use "Download ZIP" for all

### Supported File Types

- SVG (image/svg+xml)
- PNG (image/png)
- JPEG (image/jpeg)

Unsupported file types are rejected with a visible alert and live region announcement.

## Accessibility

This application is designed to be fully accessible:

- **Keyboard Navigation**: All interactive elements are keyboard-operable (Tab, Enter, Space)
- **Screen Readers**: ARIA labels, roles, and live regions announce status updates
- **Focus Management**: Clear focus indicators for all interactive elements
- **Semantic HTML**: Proper heading hierarchy and landmark regions
- **Contrast**: Color combinations meet WCAG AA standards

### UX and Accessibility Notes

- **File thumbnails** are decorative and marked with empty alt text or aria-hidden
- **Progress indication**: Optimization progress is shown with an indeterminate spinner rather than a percentage bar. The actual optimization happens in a single Web Worker pass without intermediate progress updates, so we show a "working" state rather than inventing fake granular percentages.
- **The dropzone** uses a `<label>` element for the hidden file input, providing a single accessible interactive pattern (no nested button-in-button)
- **Rejected files** trigger both a visible alert and an ARIA live region announcement
- **Status updates** are announced via ARIA live regions to keep screen reader users informed without excessive verbosity

### Testing

Accessibility has been implemented following WCAG 2.1 Level AA guidelines. For automated testing, tools like axe DevTools or WAVE can be used to verify implementation.

## Architecture

```
src/
├── react-app/
│   ├── components/ui/      # Shadcn/ui components (Button, Card, Progress)
│   ├── lib/                # Utilities (cn, formatBytes)
│   ├── types/              # TypeScript type definitions
│   ├── workers/            # Web Worker for image optimization
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # React entry point
│   └── index.css           # Tailwind CSS styles
└── worker/
    └── index.ts            # Cloudflare Worker (minimal SPA host)
```

## Technology Stack

- **React 19** - UI library
- **Vite 7** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Component primitives
- **Cloudflare Workers** - Edge deployment platform
- **Hono** - Lightweight worker framework

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Vite Documentation](https://vitejs.dev/guide/)
- [React Documentation](https://react.dev/)
- [SVGO Documentation](https://github.com/svg/svgo)
- [jSquash Project](https://github.com/jSquash/jSquash)
