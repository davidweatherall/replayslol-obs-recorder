const path = require('path');

module.exports = env => {

    const isDevelopment = env && env.development;
    const rootDir = path.join(__dirname, '..')

    return {
        entry: {
            BrowserRecorder: path.join(rootDir, 'src', 'BrowserRecorder.ts'),
            NodeRecorder: path.join(rootDir, 'src', 'NodeRecorder.ts')
        },
        mode: isDevelopment ? "development" : "production",
        node: {
            __dirname: false,
            __filename: false,
        },
        output: {
            path: path.resolve(rootDir, 'dist'),
            library: {
                type: 'commonjs',
            },
        },
        resolve: {
            extensions: ['.ts', '.js', '.json'],
            alias: {
                "~": path.resolve(rootDir, 'src')
            }
        },
        module: {
            rules: [
                {
                    test: /\.(ts|tsx)$/,
                    loader: "awesome-typescript-loader",
                },
                {
                    test: /\.node$/,
                    loader: 'node-loader',
                },
            ]
        },
        target:'node',
        watch: isDevelopment
    }
}
