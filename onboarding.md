# Gamebar Onboarding Documentation

## File Structure
.
├── \db    ### For databases and SQL 
│   ├── init.sql    ### SQL queries for starting a database
│   └── update.sql    ### SQL queries for adding to an existing database without deleting its data
├── \public   ### For images, sprites, and external script files that are used on Gamebar
│   ├── \2048       ### Sprites for the game 2048
│   ├── \alchemy    ### Sprites for the game Alchemy
│   ├── \fruitCrush    ### Sprites for the game Fruit Crush
│   ├── \index    ### Images for the Gamebar home page
│   ├── \snake    ### Sprites for the game Snake
│   ├── \stack    ### Sprites for the game Stack
│   ├── \variety    ### For sprites that are usable anywhere
|   |   ├── \deck     ### Sprites for a deck of cards
|   │   └── \fruits    ### Sprites for different fruits
│   ├── \virtualPet    ### Sprites for the game Virtual Pet
│   └── \wordle    ### Sprites for the game Wordle
├── \scripts    ### Scripts for setup
│   ├── init-db.js    ### Initializes the database, uses queries from init.sql.
│   └── update-db.js    ### Initializes updates to the database, uses queries from update.sql.
├── \views    ### The different "views" your EJS engine renders as pages
│   ├── \games   ### The views for the games hosted on Gamebar
|   |   ├── \2048
│   |   |   └── game_2048.ejs    ### The view for the game 2048
│   |   ├── \alchemy
│   |   |   └── game_alchemy.ejs    ### The view for the game Alchemy
│   |   ├── \fruitCrush
│   |   |   └── game_frust_crush.ejs    ### The view for the game Fruit Crush
│   |   ├── \snake
│   |   |   └── game_2048.ejs    ### The view for the game Snake
│   |   ├── \stack
│   |   |   └── game_2048.ejs    ### The view for the game Stack
│   |   ├── \virtualPet
│   |   |   └── game_2048.ejs    ### The view for the game Virtual Pet (currently delayed)
│   |   ├── \wordle
│   |   |   └── game_2048.ejs    ### The view for the game Wordle
│   ├── \partials    ### Smaller views or chunks of code that are used by multiple pages
|   |   ├── gameSessions.ejs     ### The code that tracks game sessions, ensuring players have to properly pay for them
|   |   └── header.ejs     ### The view for the Gamebar page header
│   ├── changes.ejs    ### The view for the Gamebar changelog
│   ├── index.ejs    ### The view for the Gamebar home page
│   ├── page.ejs    ### The view for game preview screens
│   └── profile.js    ### Incomplete profile view leftover from a BoilerPlate. To be implemented in the future
├── .env_template    ### Copy and modify this file to set environment variables
├── .gitignore    ### Configures Git to ignore certain files, instead of pushing them in commits
├── app.js    ### The main server code. Contains almost all of the backend for the project
├── Gamebar Contract.docx    ### The Emplyment contract for Gamebar. Contains company policies, and details the responsibilities of employees
└── README.md    ### Essential info for starting up the project

## Read the inline comments for help understanding the flow of the project, or ask your project lead