/* eslint no-console:"off" */

module.exports = env => {
	const config = {
		output: {
			filename: "editor.js",
		},
		externals: {
			'react': 'React',
			'react-dom:': 'ReactDOM',
			'slate': 'Slate',
		},
		devtool: '#source-map',
		module: {
			loaders: [
				{test: /\.js$/,   loaders: ["babel-loader"], exclude: /uglify-js/},
				{test: /\.scss$/, loaders: ["style-loader", "css-loader", "sass-loader"]},
				{test: /\.png/,   loaders: ["url-loader"]},
			],
		},
	}
	if (env.debug) {
		console.log(config)
		debugger // eslint-disable-line
	}
	return config
}
