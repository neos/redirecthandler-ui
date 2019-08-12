const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
    mode: 'production',
    devtool: 'source-map',
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    entry: './Resources/Private/JavaScript/index.tsx',
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'Resources/Public/JavaScript')
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "../Styles/[name].css",
            chunkFilename: "[id].css"
        }),
    ],
    module: {
        rules: [
            {
                test: /\.ts(x?)$/,
                include: [
                    path.resolve(__dirname, 'Resources/Private/JavaScript')
                ],
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            },
            {
                test: /\.(scss|css)$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader?sourceMap',
                    'sass-loader?sourceMap',
                ],
            },
            {
                enforce: 'pre',
                test: /\.js$/,
                loader: 'source-map-loader'
            }
        ]
    },

    // The following lines should be used as soon as Neos provides react libraries for backend modules
    // externals: {
    //     'react': 'React',
    //     'react-dom': 'ReactDOM'
    // }
};
