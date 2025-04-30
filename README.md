<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/NarraLeaf/.github/refs/heads/master/doc/banner-md-transparent.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/NarraLeaf/.github/refs/heads/master/doc/banner-md-light.png">
  <img alt="Fallback image description" src="https://raw.githubusercontent.com/NarraLeaf/.github/refs/heads/master/doc/banner-md-light.png">
</picture>

# NarraLeaf

A new definition of Visual Novel Engine.

## About

NarraLeaf is a lightweight, [React](https://react.dev/)/[Electron](https://electronjs.org/)-based visual novel engine built for speed and developer control. Build and package cross-platform VNs with minimal code and maximum flexibility.

### Why NarraLeaf?

- ⚡Lighter – A zero-rendering engine with minimal overhead, optimized to run smoothly on most low-end devices.
- 🔧Faster - Customizable apps and built-in automation like CI and linting help you build faster with less hassle.
- 💻More Developer Friendly - Standardized front-end development experience with strict typing and no language dependencies
- ❤️TypeScript - Using TypeScript as the main language with full support for type checking and auto-completion.

## Installation

```bash
$ npm install -g narraleaf
```

## Quick Start

### Development Server

1. Create a new project using the CLI command `narraleaf init <PROJECT_NAME>`.
2. Navigate to the project directory: `cd <PROJECT_NAME>`.
3. Run the development server: `narraleaf dev`.
4. Wait for the miriacle to happen!

### Build/Package

1. Navigate to the project directory: `cd <PROJECT_PATH>`.
2. Run the build command: `narraleaf build`.
3. Wait for the build process to complete.
4. Find the packaged app in the `dist` directory.

## Config

Below is an example of the `narraleaf.config.js` file. This file is used to configure the project and packaing behavior.

```javascript
const {BuildTarget, WindowsBuildTarget} = require("narraleaf");

module.exports = {
  renderer: {
    baseDir: "./renderer"
  },
  main: "./main/index.ts",
  build: {
    appId: "com.example.app",
    targets: [
      BuildTarget.Windows({
        target: WindowsBuildTarget.dir,
        icon: "main/assets/app-icon.ico",
      })
    ]
  },
  resources: "main/assets"
};
```

## Project Structue

```
NarraLeaf-Skeleton
├── package-js.json
├── narraleaf.config.js
├── README.md
├── .gitignore
├── (tsconfig.json)
├── /main/
├── ├── /assets/
├── │   └── app-icon.ico
│   └── index.(ts|js)
└── /renderer/
    ├── app.(tsx|jsx)
    ├── /src/
    │   ├── story.(ts|js)
    │   └── base.css
    ├── /public/
    │   └── placeholder.png
    └── /pages/
        └── home.(tsx|jsx)
```

### Main

By default, the main process is located in the `main` directory. The main process is responsible for managing the app lifecycle and creating the renderer process.

The main entry file is defined in the `narraleaf.config.js` file.  
```typescript
module.exports = {
  main: "./main/index.ts"
};
```

### Renderer

The renderer process is responsible for rendering the front-end of the app. The renderer process is a react app with a router. The base dir is defined in the `narraleaf.config.js` file.  
```typescript
module.exports = {
  renderer: {
    baseDir: "./renderer",
  },
};
```

The structure of the renderer directory cannot be changed. The renderer directory must contain the following files and directories:
- `app.(tsx|jsx)`: The main entry file for the renderer process. This file is used to render the app and manage the router.
- `/public/`: The public directory for the renderer process. This directory is used to store the static assets and resources. You can access these assets directly from the renderer process using relative URL. Example: `src="/images/img1.png"`.
- `/pages/`: The pages directory for the renderer process. This directory is used to store the pages of the app.
- `/pages/home.tsx`: The home page of the app. This is the default page that will be shown when the app is opened.

Below is an example of the renderer directory structure:

```
$root
└── /renderer/
    ├── app.tsx
    ├── /src/
    │   └── story.ts
    ├── /public/
    │   └── /images/
    │       └── img1.png
    └── /pages/
        ├── settings.tsx
        └── home.tsx
```

#### allowHTTP

By default, the renderer process does not allow HTTP requests. This is to prevent security issues. If you need to allow HTTP requests, you can set the `allowHTTP` option to `true` in the `narraleaf.config.js` file.  
```typescript
module.exports = {
  renderer: {
    baseDir: "./renderer",
    allowHTTP: true,
  },
};
```

### resources

The resources directory is used to store app icons and other resources. These resources are used by the main process and are not directly accessible from the renderer process.

The resources directory is defined in the `narraleaf.config.js` file.  
```typescript
module.exports = {
  resources: "main/assets"
};
```

### temp

You can specify a temporary directory for the build process. The default value is `./temp`. You can change this value in the `narraleaf.config.js` file.  
```typescript
module.exports = {
  temp: "./temp"
};
```

> **Note:** The temporary directory is used to store the build artifacts. This directory should not be used for anything else. The directory will be deleted anytime the build process is run.

## Documentation

Still in progress.

