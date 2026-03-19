// IMPORTS
require('dotenv').config();
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const session = require('express-session');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const sqlite3 = require('sqlite3').verbose();
const SQLiteStore = require('connect-sqlite3')(session);
const http = require('http');

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
const AUTH_URL = process.env.AUTH_URL || 'https://formbar.yorktechapps.com';
const THIS_URL = process.env.THIS_URL || `http://localhost:${PORT}`;
const API_KEY = process.env.API_KEY || 'your_api_key';

// MIDDLEWARE
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionMiddleware = session({
    store: new SQLiteStore({ db: 'sessions.db', dir: './db' }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true
});

app.use(sessionMiddleware);

function isAuthenticated(req, res, next) {
    if (req.session.user) next()
    else res.redirect('/login');
};

// SOCKET.IO CLIENT TO AUTH SERVER


const server = http.createServer(app);
const io = new Server(server);
let clientID;

const authSocket = ioClient(AUTH_URL, {
    extraHeaders: {
        api: API_KEY
    }
});

// ROUTES
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

        // GET GAMEPOINTS FROM DATABASE
        db.get('SELECT gp FROM users WHERE username = ?', [tokenData.displayName], (err, row) => {
            if (err) {
                console.error(err.message);
            } else {
                req.session.gp = row ? String(row.gp) : 0;
                console.log(`User ${tokenData.displayName} has ${req.session.gp} GP.`);
                res.redirect('/');
            }
        });
    } else {
        res.redirect(`${AUTH_URL}/oauth?redirectURL=${THIS_URL}`);
    };
});

app.get('/', isAuthenticated, (req, res) => {
    res.render('index', { user: req.session.user, gp: req.session.gp, pageName: 'Gamebar', version: 'v0.2.2' });
    clientID = req.session.token.id;
});

app.get('/changes', isAuthenticated, (req, res) => {
    res.render('changes', { user: req.session.user, gp: req.session.gp, pageName: 'Gamebar', version: 'v0.2.2' });
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
        <li class="innerli">Initial release of 2048 on Gamebar</li>
        <div class="changelog-header">v1.0.1 - Optimization change - 2/14/2026</div>
        <li class="innerli">Removed unnecessary game loop</li>
        </details>`,
        game: '2048',
        preview: `<img id="previewImg" src="/2048/2048preview.png" alt="2048 preview" height="500">`,
        playButton: `<button id="button" onclick="play()"">Play</button>`,
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
    res.render('page', { user: req.session.user, gp: req.session.gp, cost: 45, pageName: 'Gamebar', version: 'v0.2.2', data: data });
});

app.get('/snake', isAuthenticated, (req, res) => {
    const data = {
        description: `Based on the classic online game, users simply have the goal of eating as many apples and growing as big as possible without crossing over their own tail or hitting the borders. <br><br> This project was one of the first ideas for GameBar, and was officially started by Jan, becoming the second completed GameBar game!`,
        developer: 'Jan Cruz-Valentin',
        changelog: `<details>
        <summary class="summaries">Changelog</summary>
        <hr style="border: solid 1px #4d664d; margin-top: 5px; margin-bottom: 10px;">
        <div class="changelog-header">v1.0.0 - Snake Released - 3/06/2026</div>
        <li class="innerli">Initial release of Snake on Gamebar</li>
        <div class="changelog-header">v1.0.1 - Minor CSS Update - 3/06/2026</div>
        <li class="innerli">Updated Score/Time and in-game button CSS for visual appeal</li>
        </details>`,
        game: 'Snake',
        preview: `<img id="previewImg" src="/snake/snakepreview.png" alt="Snake Preview" height="500">`,
        playButton: `<button id="button" onclick="play()"">Play</button>`,
        guide: `Use the arrow keys to move the snake in the desired direction. Eat the red apples to grow longer, but be careful not to run into your own tail or the walls!`,
        specifics: ` <details>
        <summary class="summaries">Specifics</summary>
        <hr style="border: solid 1px #4d664d; margin-top: 5px; margin-bottom: 10px;">
        <h3>Keybinds:</h3>
        <li class="innerli">[▲] 'ArrowUp' / [W] 'w' - Move snake up</li>
        <li class="innerli">[▼] 'ArrowDown' / [S] 's' - Move snake down</li>
                <li class="innerli">[◄] 'ArrowLeft' / [A] 'a' - Move snake left</li>
                <li class="innerli">[►] 'ArrowRight' / [D] 'd' - Move snake right</li>
                
                <h3>Wordified Logic:</h3>
                <li class="innerli">Upon start: Difficulty and map size are selected, then game loop begins. Canvas is drawn and redrawn every frame (background, snake, apple, and score)</li>
                <li class="innerli">On keypress: Detects if Arrow key. If true, changes direction of snake accordingly.</li>
                <li class="innerli">Every frame, snake moves 1 unit in current direction. If it collides with apple, it grows and a
                new apple is spawned. If it collides with itself or the border, it's game over and overlay is drawn.</li>
                <li class="innerli">If the snake does not collide with itself or the border, and manages to fill the board, the player wins.</li>
                
                
                </details>`,
    }
    res.render('page', { user: req.session.user, gp: req.session.gp, cost: 25, pageName: 'Gamebar', version: 'v0.2.2', data: data });
}
);

app.get('/stack', isAuthenticated, (req, res) => {
    const data = {
        description: `Based on the mobile game, this singleplayer game challenges player's timing and reaction time abilities with the mission of creating as high of a tower as possible, as mistakes make that goal harder. <br><br> This project is the third completed GameBar game, and the quickest one completed yet, being finished in just a couple days.`,
        developer: 'Kris Bowman',
        changelog: `<details>
            <summary class="summaries">Changelog</summary>
            <hr style="border: solid 1px #4d664d; margin-top: 5px; margin-bottom: 10px;">
            <div class="changelog-header">v1.0.0 - Stack Released - 3/06/2026</div>
            <li class="innerli">Initial release of Stack on Gamebar</li>
            </details>`,
        game: 'Stack',
        preview: `<img id="previewImg" src="/stack/stackpreview.png" alt="Stack Preview" height="500">`,
        playButton: `<button id="button" onclick="play()"">Play</button>`,
        guide: `Select your difficulty and press the spacebar to drop the moving block as evenly onto the stack as possible. The more unevenly you drop it, the smaller the next block will be, making it harder to stack. If you miss the stack entirely, it's game over! Try to stack as high as possible!`,
        specifics: ` <details>
            <summary class="summaries">Specifics</summary>
            <hr style="border: solid 1px #4d664d; margin-top: 5px; margin-bottom: 10px;">
                <h3>Keybinds:</h3>  
                <li class="innerli">[ ________ ] 'Space' - Drop the moving block</li>  
                </details>`
    }
    res.render('page', { user: req.session.user, gp: req.session.gp, cost: 30, pageName: 'Gamebar', version: 'v0.2.2', data: data });
}
);

app.get('/alchemy', isAuthenticated, (req, res) => {
    const data = {
        description: `Based on the popular online game, this singleplayer game challenges player's problem solving and thinking skills (sort of), by challenging them to create new elements from 4 beginner ones. <br><br> This project is the fourth completed GameBar game, and my personal favorite - Chris`,
        developer: 'Christian Martin',
        changelog: `<details>
                <summary class="summaries">Changelog</summary>
                <hr style="border: solid 1px #4d664d; margin-top: 5px; margin-bottom: 10px;">
                <div class="changelog-header">v1.0.0 - Alchemy Released - 3/06/2026</div>
                <li class="innerli">Initial release of Alchemy on Gamebar, with 414 elements</li>
                <div class="changelog-header">v1.0.1 - Small Update - 3/16/2026</div>
                <li class="innerli">Added 10 new elements</li>
                <div class="changelog-header">v1.0.2 - Small Update - 3/17/2026</div>
                <li class="innerli">Added 33 new elements</li>
                <li class="innerli">Altered 2 element recipes</li>
            </details>`,
        game: 'Alchemy',
        preview: `<img id="previewImg" src="/alchemy/alchemypreview.png" alt="Alchemy Preview" height="500">`,
        playButton: `<button id="button" onclick="play()">Play</button>`,
        guide: `Drag and drop elements onto the game area to combine them. If the combination is correct, a new element will be created! You can also double click an element to spawn another one, and right click to delete it. Try to discover them all!`,
        specifics: ` <details>
                <summary class="summaries">Specifics</summary>
                <hr style="border: solid 1px #4d664d; margin-top: 5px; margin-bottom: 10px;">
                <h3>Keybinds:</h3>  
                <li class="innerli">[LMB] 'click' - Click to quick drop, drag to move elements. Double click to duplicate an element</li>
                <li class="innerli">[RMB] 'contextmenu' - Delete element</li>
                <h3>Wordified Logic:</h3>
                <li class="innerli">Upon start: Initialize game with 4 beginner elements, and establishing all locked elements in the sidebar</li>
                <li class="innerli">On element drop: Detect if dropped on another element, the sidebar, or the game area. </li>
                <li class="innerli">If dropped on another element, check if the combination of those 2 elements is valid. If true, create the new element on top of the 2 old ones, and check if the player has unlocked a new element. If they have, add it to the sidebar.</li>
                <li class="innerli">If dropped on the sidebar from the game area, delete the element. If dropped on the game area, move the element there.</li>
                </details>`
    }
    res.render('page', { user: req.session.user, gp: req.session.gp, cost: 799, pageName: 'Gamebar', version: 'v0.2.2', data: data });
});

app.get('/game_2048', isAuthenticated, (req, res) => {
    res.render('games/2048/game_2048', { user: req.session.user, gp: req.session.gp, pageName: '2048', version: 'v1.1.1' });
});

app.get('/game_snake', isAuthenticated, (req, res) => {
    res.render('games/snake/game_snake', { user: req.session.user, gp: req.session.gp, pageName: 'Snake', version: 'v1.0.1' });
});

app.get('/game_stack', isAuthenticated, (req, res) => {
    res.render('games/stack/game_stack', { user: req.session.user, gp: req.session.gp, pageName: 'Stack', version: 'v1.0.0' });
});

app.get('/game_alchemy', isAuthenticated, (req, res) => {
    res.render('games/alchemy/game_alchemy', { user: req.session.user, gp: req.session.gp, pageName: 'Alchemy', version: 'v1.0.2' });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

var socketReturn = false;
io.on('connection', (socket) => {
    authSocket.on("transferResponse", (response) => {
        console.log("Transfer Response:", response);
        socketReturn = response.success;
    });

    socket.on('transaction', (pin, amount, reward, user) => {
        const data = {
            from: clientID,
            to: 49,
            amount: amount,
            reason: 'GameBar Transaction',
            pin: pin,
        };

        const gamePoints = reward;
        const username = user;
        console.log(data);

        authSocket.emit('transferDigipogs', data);

        setTimeout(() => {
            if (socketReturn) {
                console.log(socketReturn);
                db.run('UPDATE users SET gp = gp + ? WHERE username = ?', [gamePoints, username], function (err) {
                    if (err) {
                        return console.error(err.message);
                    }
                    console.log(`Added ${gamePoints} GP to user ${username}.`);
                });
            }
        }, 1000);
    });

    socket.on('playGame', (data) => {
        let user = data.user;
        let cost = parseInt(data.cost);

        db.run('UPDATE users SET gp = gp - ? WHERE username = ?', [cost, user], function (err) {
            if (err) {
                return console.error(err.message);
            } else {
                socket.emit('relocate')
            }
        });
    });

    io.on('disconnect', () => {
        console.log('Disconnected from auth server');
    });



});
// START SERVER
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});