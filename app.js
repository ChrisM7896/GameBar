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
        console.error('Error connecting to database', err);
    } else {
        console.log('Connected to database');
    }
});

// CONSTANTS
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'your_secret_key';
const AUTH_URL = process.env.AUTH_URL || 'https://formbeta.yorktechapps.com';
const THIS_URL = process.env.THIS_URL || `http://localhost:${PORT}`;
const API_KEY = process.env.API_KEY || 'your_api_key';

// MIDDLEWARE
app.set('view engine', 'ejs');
app.use(express.static('public'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

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
    res.render('index', { user: req.session.user, pageName: 'Gamebar', version: 'v0.1.7' });
});

app.get('/changes', isAuthenticated, (req, res) => {
    res.render('changes', { user: req.session.user, pageName: 'Gamebar', version: 'v0.1.7' });
});

app.get('/login', (req, res) => {
    if (req.query.token) {
        let tokenData = jwt.decode(req.query.token);
        req.session.token = tokenData;
        req.session.user = tokenData.displayName;

        // SAVE USER TO DATABSE IF NOT EXISTS
        db.run('INSERT OR IGNORE INTO users (username) VALUES (?)', [tokenData.displayName], function (err) {
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

app.get('/2048', isAuthenticated, (req, res) => {
    const data = {
        description: `Based on the classic computer game, players must shift tiles with different numbers, combining like
                numbers with the goal of reaching a 2048 tile. <br><br>This project originally began as a solo venture,
                separate from GameBar, but as work piled up and GameBar was founded, it was just natural to include it.
                It was then completed, themed around GameBar, and is the first completed GameBar game.`,
        developer: 'Christian Martin',
        changelog: `<details>
                <summary class="summaries">Changelog</summary>
                <hr style="border: solid 1px #4d664d; margin-top: 5px; margin-bottom: 10px;">
                <div class="changelog-header">v1.0.0 - 2048 Released - 2/06/2026</div>
                <li class="innerli">Initial release of 2048 on Gamebar (No documented development updates)</li>
                <div class="changelog-header">v1.1.0 - Game Page Added - 2/12/2026</div>
                <li class="innerli">Created 2048 game page with description, changelog, and game info, rules, etc.</li>
                <div class="changelog-header">v1.1.1 - Optimization change - 2/14/2026</div>
                <li class="innerli">Removed unnecessary game loop</li>
            </details>`,
        game: '2048',
        preview: `<img src="/2048/2048preview.png" alt="2048 Logo" height="500">`,
        playButton: `<button id="button" onclick="window.location.href='/game_2048'">Play</button>`,
        guide: `Use the arrow keys to move the tiles. When two tiles with the same number touch, they merge into a
                greater one! The goal is to create a tile with the number 2048. Be careful, though: if the board fills
                up and you can't make any more moves, it's game over!`,
        specifics: ` <details>
                <summary class="summaries">Specifics</summary>
                <hr style="border: solid 1px #4d664d; margin-top: 5px; margin-bottom: 10px;">
                <h3>Keybinds:</h3>
                <li class="innerli">[▲] 'ArrowUp' - Move tiles up</li>
                <li class="innerli">[▼] 'ArrowDown' - Move tiles down</li>
                <li class="innerli">[◄] 'ArrowLeft' - Move tiles left</li>
                <li class="innerli">[►] 'ArrowRight' - Move tiles right</li>

                <h3>Tiles:</h3>
                <img src="/2048/square_2.png" class="tileImgs"><img src="/2048/square_4.png" class="tileImgs"><img
                    src="/2048/square_8.png" class="tileImgs"><img src="/2048/square_16.png" class="tileImgs"><img
                    src="/2048/square_32.png" class="tileImgs"><img src="/2048/square_64.png" class="tileImgs"><img
                    src="/2048/square_128.png" class="tileImgs"><img src="/2048/square_256.png" class="tileImgs"><img
                    src="/2048/square_512.png" class="tileImgs"><img src="/2048/square_1024.png" class="tileImgs"><img
                    src="/2048/square_2048.png" class="tileImgs">

                <h3>Wordified Logic:</h3>
                <li class="innerli">Upon start: Game loop begins, canvas is drawn and redrawn every frame (background,
                    tiles, and lines)</li>
                <li class="innerli">Singular tile spawns onload; Either a 2 (90%) or a 4 (10%). All spawn logic follows
                    this rule</li>
                <li class="innerli">On keypress: Detects if Arrow key. If true, moves tiles as far as possible in that
                    direction, and combines if it collides with a like tile. New tile is subsequently spawned.</li>
                <li class="innerli">Game then checks for Win or Loss. If either is true, overlay is drawn accordingly.
                </li>



            </details>`
    }
    res.render('page', { user: req.session.user, pageName: 'Gamebar', version: 'v0.1.7', data: data });
});

app.get('/game_2048', isAuthenticated, (req, res) => {
    res.render('games/2048/game_2048', { user: req.session.user, pageName: '2048', version: 'v1.1.1' });
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