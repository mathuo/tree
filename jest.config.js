const package = require("./package");

const {join, normalize} = require("path");

const tsconfig = normalize(join(__dirname, "tsconfig.test.json"))

module.exports = {
    preset: "ts-jest",
    projects: ["<rootDir>/jest.config.js"],
    transform: {
        "^.+\\.tsx?$":"ts-jest"
    },
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    globals: {
        "ts-jest": {
            tsconfig,
            experimental: true,
            compilerHost: true
        }
    },
    roots: ["<rootDir>"],
    modulePaths: ["<rootDir>/tree/src"],
    displayName: {name: package.name, color: "blue"},
    collectCoverageFrom:[
        "<rootDir>/tree/src/**/*.{js,jsx,ts,tsx}",
    ],
    coveragePathIgnorePatterns: [
        "/node_modules/",
        "<rootDir>/tree/src/__tests__/",
    ],
    coverageDirectory: "coverage"
}
