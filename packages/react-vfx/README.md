# react-vfx

> **This package has been renamed to [`@vfx-js/react`](https://www.npmjs.com/package/@vfx-js/react).**
>
> This `react-vfx` package now re-exports `@vfx-js/react` for backward compatibility. New projects should depend on `@vfx-js/react` directly.

## Migrating

```sh
npm uninstall react-vfx
npm install @vfx-js/react
```

Then update your imports:

```diff
- import { VFXProvider, VFXImg } from "react-vfx";
+ import { VFXProvider, VFXImg } from "@vfx-js/react";
```

The two packages export exactly the same API. Switching is a pure rename.

## Staying on the legacy 0.x API

If you need the pre-1.0 API, pin `react-vfx@0.18.x`:

```json
{
  "dependencies": {
    "react-vfx": "0.18.x"
  }
}
```

## Documentation

See the main project: <https://github.com/fand/vfx-js>
