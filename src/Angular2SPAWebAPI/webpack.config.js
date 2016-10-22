'use strict';
let webpack = require('webpack');
let CleanWebpackPlugin = require('clean-webpack-plugin');
let HtmlWebpackPlugin = require('html-webpack-plugin');

let isProd = process.env.NODE_ENV === 'production';

if (!isProd) {

    // In development mode, we use JiT compilation & source map file, without minification.
    module.exports = {
        entry: {
            'app': './app/main.ts'
        },

        output: {
            path: "./wwwroot/",
            filename: "dist/[name].bundle.js",
            chunkFilename: 'dist/[name].chunk.js'
        },

        module: {
            rules: [
                {
                    test: /\.ts$/,
                    loaders: [
                        'awesome-typescript-loader',
                        'angular2-router-loader', // for lazy loading
                        'angular2-template-loader', // for templateUrl & styleUrls
                        'source-map-loader' // for source map files
                    ]
                },
                // html
                {
                    test: /\.html$/,
                    loader: 'raw-loader'
                },
                // css
                {
                    test: /\.css$/,
                    loaders: [
                       'style-loader',
                       'css-loader',
                       'raw-loader'
                    ]
                },
                // scss
                {
                    test: /\.scss$/,
                    loaders: [
                       'style-loader',
                       'css-loader',
                       'sass-loader'
                    ]
                }
            ],
            exprContextCritical: false
        },

        plugins: [
            // Adds script for the bundle in index.html.
            new HtmlWebpackPlugin({
                filename: 'index.html',
                inject: 'body',
                template: 'app/index.html'
            })
        ],

        resolve: {
            extensions: ['.ts', '.js', '.html', '.css', '.scss']
        },

        devtool: 'source-map'

    };

} else {

    // In production mode, we use AoT compilation & minification.
    module.exports = {
        entry: {
            'app-aot': './app/main-aot.js'
        },

        output: {
            path: "./wwwroot/",
            filename: "dist/[name].bundle.js",
            chunkFilename: 'dist/[name].chunk.js'
        },

        module: {
            rules: [
                {
                    test: /\.ts$/,
                    loaders: [
                        'awesome-typescript-loader',
                        'angular2-router-loader?aot=true&genDir=aot/app'
                    ]
                },
                // html
                {
                    test: /\.html$/,
                    loader: 'raw-loader'
                },
                // css
                {
                    test: /\.css$/,
                    loaders: [
                       'style-loader',
                       'css-loader',
                       'raw-loader'
                    ]
                },
                // scss
                {
                    test: /\.scss$/,
                    loaders: [
                       'style-loader',
                       'css-loader',
                       'sass-loader'
                    ]
                }
            ],
            exprContextCritical: false
        },

        plugins: [
            // Cleans dist folder.
            new CleanWebpackPlugin(['./wwwroot/dist']),
            // Minimizes the bundle.
            new webpack.LoaderOptionsPlugin({
                minimize: true,
                debug: false
            }),
            new webpack.optimize.UglifyJsPlugin({
                compress: {
                    warnings: false
                },
                output: {
                    comments: false
                },
                sourceMap: false
            }),
            // Adds script for the bundle in index.html.
            new HtmlWebpackPlugin({
                filename: 'index.html',
                inject: 'body',
                template: 'app/index.html'
            })
        ],

        resolve: {
            extensions: ['.ts', '.js', '.html', '.css', '.scss']
        },

        devtool: false

    };

}
