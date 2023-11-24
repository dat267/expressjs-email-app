module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true,
        "node": true,
    },
    "extends": "eslint:recommended",
    "overrides": [
        {
            "env": {
                "node": true,
            },
            "files": [
                ".eslintrc.{js,cjs}",
            ],
            "parserOptions": {
                "sourceType": "script",
            },
        },
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
    },
    "rules": {
        "no-multiple-empty-lines": ["error", {"max": 1, "maxEOF": 1, "maxBOF": 1}],
        "comma-dangle": ["error", "always-multiline"],
    },
};
