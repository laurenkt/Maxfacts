/* eslint no-console:"off" */

module.exports = env => {
	const config = {
		entry: "./app.js",
		output: {
			filename: "dist/app.js",
			publicPath: "/dist/",
		},
		devtool: '#source-map',
		module: {
			loaders: [
				{test: /\.js$/,   loaders: ["babel-loader"], exclude: /uglify-js/},
			],
		},
		node: {
			fs: "empty",
		}
	};
	if (env.debug) {
		console.log(config);
		debugger; // eslint-disable-line
	}
	return config;
};
