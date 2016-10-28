Maxfacts
========

Install dependencies with `npm`:

	cd maxfacts
	npm install

Then start the server:

	npm start

If this is the first time running the application you may want to restore from one of the most recent backups.

**Note:** you will need the `MONGOHQ_URL` environment variable set with the MongoDB URL, you can do this in a `.env` file or by prefixing the start command with the variable:

	# Put in a .env file
	echo "MONGO_URI=mongodb://localhost/dbname" > .env

	# OR:

	# Prepend directly into the start command
	MONGO_URI="mongodb://localhost/dbname" npm start

The default configuration watches the project directory for changes and restarts node server automatically.

Stylesheets are implemented using Sass with the `.scss` extension - these are automatically compiled to CSS.

Javascript in the `client` directory will be compiled with Babel supporting React/JSX.

Backups
-------

Backups by default are made in the `backups/` directory.

You can make a new backup at any time with:

    npm run backup

To restore from a backup, navigate to the directory where the backup is contained and use `mongorestore`:

    mongorestore -d maxfacts maxfacts
