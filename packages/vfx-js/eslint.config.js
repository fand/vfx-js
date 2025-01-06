export default {
    parser: "@typescript-eslint/parser",
    env: {
        es6: true,
        node: true,
        browser: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
        "plugin:react/recommended",
    ],
    plugins: ["@typescript-eslint", "react-hooks"],
    parserOptions: {
        sourceType: "module",
        project: "./tsconfig.json",
    },
    rules: {
        "@typescript-eslint/explicit-function-return-type": [
            "warn",
            {
                allowExpressions: true,
                allowTypedFunctionExpressions: true,
            },
        ],
        "react/prop-types": "off",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
    },
    settings: {
        react: {
            version: "detect",
        },
    },
    overrides: [
        {
            files: ["*.js"],
            rules: {
                "@typescript-eslint/no-var-requires": 0,
            },
        },
    ],
    ignorePatterns: ["src/gifuct-js"],
};
