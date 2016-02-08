var Path = require("path");
var Webpack = require("webpack");
var Config = require("webpack-configurator");

// Factory function.
var loader = Config.loader;

module.exports = {
    entry: "./main.js",
    output: {
        filename: "bundle.js"
    },
    loaders: {
        dust: loader({
            test: /\.dust$/,
            query: {
                path: Path.join(__dirname, "views")
            }
        }),
        sass: loader({
            test: /\.scss$/,
            loader: ["style", "css", "sass"]
        })
    }
};
