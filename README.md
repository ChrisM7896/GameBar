# GameBar
Programming project intended to have various solo and multiplayer games incorporating Formbar authentication, digipog spending, and competitive elements. This is to be developed for usage in the classroom as a company project.

# Installation Guide

***

## Package Configuration
### Modules
To install the project's required dependencies, copy the following command and paste it in the terminal:
> npm install connect-sqlite3 datamuse dotenv ejs express express-session jsonwebtoken multer nodemon pm2 socket.io socket.io-client sqlite3 winston

This should create package.json and package-lock.json files.
Under dependencies, you should see something like this:

>  "dependencies": {
>     "connect-sqlite3": "^latest-version",
>     "datamuse": "^latest-version",
>     "dotenv": "^latest-version",
>     "ejs": "^latest-version",
>     "express": "^latest-version",
>     "express-session": "^latest-version",
>     "jsonwebtoken": "^latest-version",
>     "multer": "^latest-version",
>     "nodemon": "^latest-version",
>     "pm2": "^latest-version",
>     "socket.io": "^latest-version",
>     "socket.io-client": "^latest-version",
>     "sqlite3": "^latest-version",
>     "winston": "^latest-version"
>  }

***

### Initializing the Database
In order to initialize your project's database, you *need* to add the following to your package.json file:
>    "scripts": {
>        "init-db": "node scripts/init-db.js",
>    }
To initialize your database, run the following command in your terminal:
> npm run init-db

***

## Templates
### Environment Variables
Copy the .env_template file. Rename it to .env. Configure your PORT and SESSION_SECRET. Configure your THIS_URL to your desired redirect path for after login.

*** 

## Starting the Server
After the server has been properly configured as outlined above, start the server with the following command:
> npx pm2 start app.js --name gamebar

## Restarting/Stopping the Server
To restart or stop the server from running, use the following commands:

### Restarting
> npx pm2 restart gamebar
### Stopping
> npx pm2 stop gamebar