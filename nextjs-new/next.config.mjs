/** @type {import('next').NextConfig} */

import CopyPlugin from "copy-webpack-plugin";

const nextConfig = {

    webpack: (config) => {
        config.plugins.push(
            new CopyPlugin({
                patterns: [
                    // error is triggered during the build if the file is not there (but not actually used from here)
                    {
                        from: 'node_modules/@subzerocloud/rest/subzero_wasm_bg.wasm',
                        to: 'server/app/rest/[...path]/subzero_wasm_bg.wasm'
                    },
                    // this is used on runtime
                    {
                        from: 'node_modules/@subzerocloud/rest/subzero_wasm_bg.wasm',
                        to: 'server/vendor-chunks/subzero_wasm_bg.wasm'
                    }
                ],
            })
        );

        return config;
    },
};

export default nextConfig;
