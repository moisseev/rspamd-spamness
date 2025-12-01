import globals from "globals";
import html from "eslint-plugin-html";
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";

export default [
    js.configs.all,
    stylistic.configs.all,
    {ignores: ["**/vendor/i18n.js"]},
    {
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.browser,
            },
            sourceType: "script",
        },
        plugins: {
            "@stylistic": stylistic,
            html,
        },
        rules: {
            "@stylistic/array-element-newline": ["error", "consistent"],
            "@stylistic/comma-dangle": ["error", "only-multiline"],
            "@stylistic/dot-location": ["error", "property"],
            "@stylistic/function-call-argument-newline": "off",
            "@stylistic/indent-binary-ops": "off",
            "@stylistic/max-len": ["error", {code: 120}],
            "@stylistic/multiline-ternary": ["error", "always-multiline"],
            "@stylistic/newline-per-chained-call": ["error", {ignoreChainWithDepth: 4}],
            "@stylistic/no-extra-parens": ["error", "functions"],
            "@stylistic/no-mixed-operators": "off",
            "@stylistic/nonblock-statement-body-position": "off",
            "@stylistic/object-property-newline": ["error", {allowAllPropertiesOnSameLine: true}],
            "@stylistic/padded-blocks": "off",
            "@stylistic/quote-props": ["error", "consistent-as-needed"],
            "@stylistic/space-before-function-paren": ["error", {anonymous: "always", named: "never"}],

            "camelcase": "off",
            "capitalized-comments": "off",
            "complexity": ["error", 30],
            "curly": "off",
            "func-names": "off",
            "func-style": ["error", "declaration"],
            "id-length": ["error", {min: 1}],
            "max-lines": ["error", 600],
            "max-lines-per-function": ["warn", 250],
            "max-params": ["warn", 6],
            "max-statements": ["warn", 50],
            "no-alert": "off",
            "no-continue": "off",
            "no-implicit-globals": "off",
            "no-magic-numbers": "off",
            "no-plusplus": "off",
            "no-ternary": "off",
            "no-use-before-define": ["error", {functions: false}],
            "object-shorthand": "off",
            "one-var": "off",
            "prefer-arrow-callback": "off",
            "prefer-named-capture-group": "off",
            "prefer-object-has-own": "off",
            "prefer-template": "off",
            "require-jsdoc": "off",
            "require-unicode-regexp": "off",
            "strict": ["error", "global"],
        },
    },
    {
        files: ["**/*.mjs"],
        languageOptions: {ecmaVersion: 2020, sourceType: "module"},
    },
];
