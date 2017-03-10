Maxfacts
========

[![build status](https://git.cs.york.ac.uk/lt696/MaxFacts/badges/master/build.svg)](https://git.cs.york.ac.uk/lt696/MaxFacts/commits/master)

Web application to serve and manage Maxfacts pages.

Installation
------------

Install dependencies with `npm`:

	cd maxfacts
	npm install

Then start the server:

	npm start

If this is the first time running the application you may want to restore from one of the most recent backups (see *Backups* section below).

**Note:** you will need the `MONGOHQ_URL` environment variable set with the MongoDB URL, you can do this in a `.env` file or by prefixing the start command with the variable:

	# Put in a .env file
	echo "MONGO_URI=mongodb://localhost/dbname" > .env

	# OR:

	# Prepend directly into the start command
	MONGO_URI="mongodb://localhost/dbname" npm start

The default configuration watches the project directory for changes and restarts node server automatically.

Stylesheets are implemented using Sass with the `.scss` extension - these are automatically compiled to CSS.

Javascript in the `client` directory will be compiled with Babel supporting React/JSX.

**Note:** to host the dev server on a particular port it is easiest to map that port to 3000: `sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 3000`

Backups
-------

Backups by default are made in the `backups/` directory.

You can make a new backup at any time with:

    npm run backup

To restore from a backup, use

	npm run restore

to restore the most recent backup. Otherwise navigate to the directory where the backup is contained and use `mongorestore`:

    mongorestore -d maxfacts maxfacts
