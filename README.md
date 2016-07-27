MaxFacts
========

Install dependencies with `npm`:

	cd maxfacts
	npm install

Then start the server:

	npm start

**Note:** you will need the `MONGOHQ_URL` environment variable set with the MongoDB URL, you can do this in a `.env` file or by prefixing the start command with the variable:

	# Put in a .env file
	echo "MONGOHQ_URL=mongodb://localhost/dbname" > .env

	# OR:

	# Prepend directly into the start command
	MONGHQ_URL="mongodb://localhost/dbname" npm start

The default configuration watches the project directory for changes and restarts node server automatically.

Stylesheets are implemented using Sass with the `.scss` extension - these are automatically compiled to CSS.

Javascript in the `public` directory will be compiled with Babel supporting React/JSX.
