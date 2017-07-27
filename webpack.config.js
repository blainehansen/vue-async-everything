// module.exports = {
// 	entry: './src/index.js',
// 	target: 'node',
// 	output: {
// 		path: './lib',
// 		filename: 'index.js',
// 		libraryTarget: 'umd'
// 	},
// 	module: {
// 		loaders: [{
// 			test: /\.js$/,
// 			loader: 'babel',
// 			exclude: /node_modules/
// 		}]
// 	}
// }

let config = {
	entry: __dirname + '/src/index.js',
	devtool: 'source-map',
	output: {
		path: __dirname + '/lib',
		filename: 'index.js',
		library: 'VueAsyncProperties',
		libraryTarget: 'umd',
		umdNamedDefine: true
	},
	module: {
		loaders: [
			{
				test: /(\.js)$/,
				loader: 'babel-loader',
				exclude: /node_modules/
			}
		]
	},
	externals: {
		"lodash": {
			commonjs: "lodash",
			commonjs2: "lodash",
			amd: "lodash",
			root: "_"
		}
	}
}

module.exports = config