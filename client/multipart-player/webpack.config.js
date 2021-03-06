/* eslint no-console:"off" */

module.exports = env => {
	const config = {
		output: {
			filename: 'multipart-player.js',
		},
		externals: {
			'react': 'React',
			'react-dom': 'ReactDOM',
		},
		devtool: '#source-map',
		module: {
			loaders: [
				{test: /\.js$/, loaders: ['babel-loader'], exclude: /uglify-js/},
			],
		},
	}
	if (env.debug) {
		console.log(config)
		debugger // eslint-disable-line
	}
	return config
}
