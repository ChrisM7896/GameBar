// IMPORTS
require('dotenv').config();
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const session = require('express-session');
const { io } = require('socket.io-client');
const sqlite3 = require('sqlite3').verbose();
const SQLiteStore = require('connect-sqlite3')(session);

// DATABASE SETUP
const db = new sqlite3.Database('./db/app.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            displayName TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
            }
        });
        // Create pets table
        db.run(`CREATE TABLE IF NOT EXISTS pets (
            owner	TEXT NOT NULL,
            id	INTEGER NOT NULL UNIQUE,
            name	TEXT,
            type	TEXT,
            hunger    INTEGER DEFAULT 80,
            mood      INTEGER DEFAULT 80,
            status      INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY(id AUTOINCREMENT)
        )`, (err) => {
            if (err) {
                console.error('Error creating pets table:', err.message);
            }
        });
    }
});

function queryPets(displayName) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM pets WHERE pets.owner = ?`, [displayName], (err, rows) => {
            if (err) {
                console.error('Error querying pets:', err.message);
                reject(err); // Reject the promise with the error
                return;
            }
            resolve(rows); // Resolve the promise with the rows
        });
    });
}

function saveNewPets(displayName, petName, type, hunger, mood, status) {
    db.run(
        `INSERT INTO pets (owner, name, type, hunger, mood, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [displayName, petName, type, hunger, mood, status],
        (err) => {
            if (err) {
                console.error('Error saving pet to database:', err.message);
            }
        }
    );
}

function savePetData(displayName, petName, type, hunger, mood, status) {
    db.run(
        `UPDATE pets SET type = ?, hunger = ?, mood = ?, status = ? WHERE owner = ? AND name = ?`,
        [type, hunger, mood, status, displayName, petName],
        (err) => {
            if (err) {
                console.error('Error updating pet stats in database:', err.message);
            }
        }
    );
}

function renamePet(petId, newName) {
    db.run(
        `UPDATE pets SET name = ? WHERE id = ?`,
        [newName, petId],
        (err) => {
            if (err) {
                console.error('Error renaming pet in database:', err.message);
            }
        }
    );
};

function resetPets(displayName) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM pets WHERE owner = ?`,
            [displayName],
            (err) => {
                if (err) {
                    console.error('Error resetting pets in database:', err.message);
                    reject(err); // Reject the promise with the error
                } else {
                    resolve(); // Resolve the promise on successful deletion
                }
            }
        )
    });
}

// CONSTANTS
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'your_secret_key';
const AUTH_URL = process.env.AUTH_URL || 'https://formbeta.yorktechapps.com';
const THIS_URL = process.env.THIS_URL || `http://localhost:${PORT}`;
const API_KEY = process.env.API_KEY || 'your_api_key';

// MIDDLEWARE
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    store: new SQLiteStore({ db: 'sessions.db', dir: './db' }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

function isAuthenticated(req, res, next) {
    if (req.session.user) next()
    else res.redirect('/login');
};

// SOCKET.IO CLIENT TO AUTH SERVER
const socket = io(AUTH_URL, {
    extraHeaders: {
        api: API_KEY
    }
});

// ROUTES
app.get('/', isAuthenticated, (req, res) => {
    res.render('index', { user: req.session.user, pageName: 'Gamebar', version: 'v0.1.6' });
});

app.get('/changes', isAuthenticated, (req, res) => {
    res.render('changes', { user: req.session.user, pageName: 'Gamebar', version: 'v0.1.6' });
});

app.get('/login', (req, res) => {
    if (req.query.token) {
        let tokenData = jwt.decode(req.query.token);
        req.session.token = tokenData;
        req.session.user = tokenData.email;
        req.session.displayName = tokenData.displayName;

        // SAVE USER TO DATABASE IF NOT EXISTS
        db.run('INSERT OR IGNORE INTO users (username, displayName) VALUES (?, ?)', [tokenData.email, tokenData.displayName], function (err) {
            if (err) {
                return console.error(err.message);
            }
            console.log(`User ${tokenData.displayName} saved to database.`);
        });

        res.redirect('/');
    } else {
        res.redirect(`${AUTH_URL}/oauth?redirectURL=${THIS_URL}`);
    };
});

app.get('/page_2048', isAuthenticated, (req, res) => {
    res.render('games/2048/page_2048', { user: req.session.user, pageName: 'Gamebar', version: 'v0.1.6' });
});

app.get('/game_2048', isAuthenticated, (req, res) => {
    res.render('games/2048/game_2048', { user: req.session.user, pageName: '2048', version: 'v1.1.1' });
});

app.get('/game_virtualPet', isAuthenticated, async (req, res) => {
    try {
        if (!req.session.user) {
            res.redirect('/login');
        } else if (req.session.user && isAuthenticated) {
            try {
                let pets = await queryPets(req.session.displayName)

                res.render('games/virtualPet/game_virtualPet', {
                    user: req.session.user,
                    displayName: req.session.displayName,
                    pets: pets
                });
            }
            catch (error) {
                res.send(error.message)
            }
        };
    }
    catch (error) {
        res.send(error.message)
    }
});

app.post('/createPet', isAuthenticated, async (req, res) => {
    try {
        if (req.session.user && req.session.displayName) {
            let startingHunger
            let startingMood
            switch (req.body.type) {
                case 'cat':
                    startingHunger = 80;
                    startingMood = 55;
                    break;
                case 'dog':
                    startingHunger = 65;
                    startingMood = 70;
                    break;
                case 'rabbit':
                    startingHunger = 75;
                    startingMood = 60;
                    break;
                case 'parrot':
                    startingHunger = 60;
                    startingMood = 85;
                    break;
                case 'fish':
                    startingHunger = 90;
                    startingMood = 45;
                    break;
            }
            await saveNewPets(req.session.displayName, req.body.name, req.body.type, startingHunger, startingMood, 1); //default hunger, mood, and status values for new pets
            res.status(200).json({ message: 'Pet added successfully' });
        } else {
            res.status(401).json({ message: 'Unauthorized' });
        }
    } catch (error) {
        res.status(500).json({ message: 'An error occurred while adding the pet' });
    }
});

app.get('/getPetData', isAuthenticated, async (req, res) => {
    try {
        if (req.session.user && req.session.displayName) {
            let petData = await queryPets(req.session.displayName)
            res.status(200).json(petData);
        } else {
            res.status(401).json({ message: 'Unauthorized' });
        }
    } catch (error) {
        res.status(500).json({ message: 'An error occurred while updating client stats' });
    }
});

app.post('/renamePet', isAuthenticated, async (req, res) => {
    try {
        if (req.session.user && req.session.displayName) {
            await renamePet(req.body.petId, req.body.newName);
            res.status(200).json({ message: 'Pet renamed successfully' });
        } else {
            res.status(401).json({ message: 'Unauthorized' });
        }
    } catch (error) {
        res.status(500).json({ message: 'An error occurred while renaming the pet' });
    }
});

app.post('/savePetData', isAuthenticated, async (req, res) => {
    try {
        if (req.session.user && req.session.displayName) {
            await savePetData(req.session.displayName, req.body.petName, req.body.type, req.body.hunger, req.body.mood, req.body.status);
            res.status(200).json({ message: 'Pet stats saved successfully' });
        } else {
            res.status(401).json({ message: 'Unauthorized' });
        }
    } catch (error) {
        res.status(500).json({ message: 'An error occurred while saving pet stats' });
    }
});

app.post('/resetGame', isAuthenticated, async (req, res) => {
    try {
        if (req.session.user && req.session.displayName) {
            await resetPets(req.session.displayName);
            res.status(200).json({ message: 'Game reset successfully' });
        } else {
            res.status(401).json({ message: 'Unauthorized' });
        }
    } catch (error) {
        res.status(500).json({ message: 'An error occurred while resetting the game' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

socket.on('connect', () => {
    console.log('Connected to auth server');
    socket.emit('getActiveClass');
});

socket.on('disconnect', () => {
    console.log('Disconnected from auth server');
});

socket.on('setClass', (classData) => {
    console.log('Received class data:', classData);
    // Handle class data as needed
});

// START SERVER
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});