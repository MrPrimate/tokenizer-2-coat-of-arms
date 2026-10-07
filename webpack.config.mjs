// Bundles the plugin into dist/main.js for release. Development loads
// scripts/index.js directly (module-developer.json), so there is no build
// step there.
import path from "path";
import { fileURLToPath } from "url";
import TerserPlugin from "terser-webpack-plugin";

const root = path.dirname(fileURLToPath(import.meta.url));

export default {
  mode: "production",
  entry: {
    main: "./scripts/index.js",
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          // eslint-disable-next-line camelcase
          keep_classnames: true,
          // eslint-disable-next-line camelcase
          keep_fnames: true,
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(root, "dist"),
    clean: true,
  },
  module: {
    parser: {
      javascript: {
        // the window's lazy import() stays in the one file
        dynamicImportMode: "eager",
      },
    },
  },
};
