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
const datamuse = require('datamuse');
const { on } = require('cluster');

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

// VARIABLES AND LISTS FOR ONETIME GAME LOGIC
let paid = false;

// ROUTES
app.get('/login', (req, res) => {
    if (req.query.token) {
        let tokenData = jwt.decode(req.query.token);
        req.session.token = tokenData;
        req.session.user = tokenData.displayName;

        // SAVE USER TO DATABSE IF NOT EXISTS
        db.get('SELECT id FROM users WHERE username = ?', [tokenData.displayName], function (err, row) {
            if (err) {
                return console.error(err.message);
            }

            if (!row) {
                db.run('INSERT INTO users (username) VALUES (?)', [tokenData.displayName], function (err) {
                    if (err) {
                        return console.error(err.message);
                    }
                    console.log(`User ${tokenData.displayName} saved to database.`);
                });

                // Create a onetime entry for the new user
                db.run(
                    'INSERT OR IGNORE INTO onetime (user_id) VALUES ((SELECT id FROM users WHERE username = ?))',
                    [tokenData.displayName],
                    function (err) {
                        if (err) {
                            return console.error(err.message);
                        }
                        console.log(`Onetime entry created for user ${tokenData.displayName}.`);
                    }
                );
            }
        });

        res.redirect('/');
    } else {
        res.redirect(`${AUTH_URL}/oauth?redirectURL=${THIS_URL}`);
    };
});

app.get('/', isAuthenticated, (req, res) => {
    clientID = req.session.token.id;

    // GET GAMEPOINTS FROM DATABASE
    db.get('SELECT gp FROM users WHERE username = ?', [req.session.user], (err, row) => {
        if (err) {
            console.error(err.message);
        } else {
            req.session.gp = row ? row.gp : 0;
            res.render('index', { user: req.session.user, gp: req.session.gp, pageName: 'Gamebar', version: 'v0.3.4' });
        }
    });
});

app.get('/changes', isAuthenticated, (req, res) => {
    res.render('changes', { user: req.session.user, gp: req.session.gp, pageName: 'Gamebar', version: 'v0.3.4' });
});

app.get('/2048', isAuthenticated, (req, res) => {
    const data = {
        description: `Based on the classic computer game, players must shift tiles with different numbers, combining like
        numbers with the goal of reaching a 2048 tile. <br><br>This project originally began as a solo venture,
        separate from Gamebar, but as work piled up and Gamebar was founded, it was just natural to include it.
        It was then completed, themed around Gamebar, and is the first completed Gamebar game.`,
        developer: 'Christian Martin',
        changelog: `<details>
        <summary class="summaries">Changelog</summary>
        <hr style="border: solid 1px #4d664d; margin-top: 5px; margin-bottom: 10px;">
        <div class="changelog-header">v1.0.0 - 2048 Released - 2/06/2026</div>
        <li class="innerli">Initial release of 2048 on Gamebar</li>
        <div class="changelog-header">v1.0.1 - Optimization change - 2/14/2026</div>
        <li class="innerli">Removed unnecessary game loop</li>
        <div class="changelog-header">v1.0.2 - Minor Change - 3/26/2026</div>
        <li class="innerli">Removed false text</li>
        </details>`,
        game: '2048',
        preview: `<img id="previewImg" src="/2048/2048preview.png" alt="2048 preview" height="500">`,
        playButton: `<button id="button" onclick="play()">Play</button>`,
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
        
        <h3>Sprites:</h3>
        <img src="/2048/square_2.png" class="sprites"><img src="/2048/square_4.png" class="sprites"><img
        src="/2048/square_8.png" class="sprites"><img src="/2048/square_16.png" class="sprites"><img
        src="/2048/square_32.png" class="sprites"><img src="/2048/square_64.png" class="sprites"><img
        src="/2048/square_128.png" class="sprites"><img src="/2048/square_256.png" class="sprites"><img
        src="/2048/square_512.png" class="sprites"><img src="/2048/square_1024.png" class="sprites"><img
        src="/2048/square_2048.png" class="sprites">
        
        <h3>Wordified Logic:</h3>
        <li class="innerli">Upon start: Game loop begins, canvas is drawn and redrawn every frame (background,
        tiles, and lines)</li>
        <li class="innerli">Singular tile spawns onload; Either a 2 (90%) or a 4 (10%). All spawn logic follows
        this rule</li>
        <li class="innerli">On keypress: Detects if Arrow key. If true, moves tiles as far as possible in that
        direction, and combines if it collides with a like tile. New tile is subsequently spawned.</li>
        <li class="innerli">Game then checks for Win or Loss. If either is true, overlay is drawn accordingly.
        </li>
        
        
        
        </details>`,
    }

    res.render('page', { user: req.session.user, gp: req.session.gp, cost: 45, pageName: 'Gamebar', version: 'v0.3.4', data: data });
});

app.get('/snake', isAuthenticated, (req, res) => {
    const data = {
        description: `Based on the classic online game, users simply have the goal of eating as many apples and growing as big as possible without crossing over their own tail or hitting the borders. <br><br> This project was one of the first ideas for Gamebar, and was officially started by Jan, becoming the second completed Gamebar game!`,
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
    res.render('page', { user: req.session.user, gp: req.session.gp, cost: 25, pageName: 'Gamebar', version: 'v0.3.4', data: data });
}
);

app.get('/stack', isAuthenticated, (req, res) => {
    const data = {
        description: `Based on the mobile game, this singleplayer game challenges player's timing and reaction time abilities with the mission of creating as high of a tower as possible, as mistakes make that goal harder. <br><br> This project is the third completed Gamebar game, and the quickest one completed yet, being finished in just a couple days.`,
        developer: 'Kris Bowman',
        changelog: `<details>
            <summary class="summaries">Changelog</summary>
            <hr style="border: solid 1px #4d664d; margin-top: 5px; margin-bottom: 10px;">
            <div class="changelog-header">v1.0.0 - Stack Released - 3/06/2026</div>
            <li class="innerli">Initial release of Stack on Gamebar</li>
            <div class="changelog-header">v1.0.1 - Small Tweak - 3/20/2026</div>
            <li class="innerli">Deleted mode selection refresh on game over</li>
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
                <h3> Wordified Logic:</h3>
                <li class="innerli">Player chooses difficulty from the options in the mode selection menu.</li>
                <li class="innerli">Game loop begins, drawing the bottom platform. This platform is considered as one of the blocks.</li>
                <li class="innerli">First block starts from either the left or right side of the canvas, and moves towards the center at a speed determined by the difficulty.</li>
                <li class="innerli">The player must press the space bar when the block is aligned with the platform to gain points. If the block hits the side of the canvas, it bounces off and speeds up slightly.</li>
                <li class="innerli">If the player presses when the block is aligned with the previous block, they earn one point. If it is not perfectly aligned, the block's width is sliced to match the side of the previous block, making it smaller and more difficult to align with the next block.</li>
                <li class="innerli">If the block is perfectly aligned, check if the last five blocks are all perfectly aligned. If not, award one extra point and increase the perfect counter. If so, award four extra points and clear the perfect counter.</li>
                <li class="innerli">If the player clicks when the block is not aligned at all, the game ends and displays a message based on the player's score and perfect counter.</li>
                </details>
            `,
    }
    res.render('page', { user: req.session.user, gp: req.session.gp, cost: 30, pageName: 'Gamebar', version: 'v0.3.4', data: data });
});

app.get('/alchemy', isAuthenticated, (req, res) => {
    const data = {
        description: `Based on the popular online game, this singleplayer game challenges player's problem solving and thinking skills (sort of), by challenging them to create new elements from 4 beginner ones. <br><br> This project is the fourth completed Gamebar game, and my personal favorite - Chris`,
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
                <div class="changelog-header">v1.1.0 - Elements Patch - 3/24/2026</div>
                <li class="innerli">Moved element definitions to server-side, preventing cheating through inspect elements</li>
                <li class="innerli">Added 24 new elements</li>
                <div class="changelog-header">v1.1.1 - Small Update - 3/26/2026</div>
                <li class="innerli">Added 34 new elements</li>
                <div class="changelog-header">v1.2.0 - Game Saving - 4/08/2026</div>
                <li class="innerli">Implemented game saving functionality</li>
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
                </details>`,
    }
    res.render('page', { user: req.session.user, gp: req.session.gp, cost: 799, pageName: 'Gamebar', version: 'v0.3.4', data: data });
});

app.get('/wordle', isAuthenticated, (req, res) => {
    const data = {
        description: 'Based on the classic online game, this singleplayer game challenges the player\'s vocabulary, challenging them to guess the hidden word in six tries or less. <br><br> This project is the fifth completed Gamebar game, and the quickest completed one, being finished in only 3 hours. It was also the first Gamebar game to use its own library, which proved to be a challenge. <br><br>Overall, I love how this turned out, I\'m glad I got bored on that particular weekend - Chris',
        developer: 'Christian Martin',
        changelog: `<details>
        <summary class="summaries">Changelog</summary>
        <hr style="border: solid 1px #4d664d; margin-top: 5px; margin-bottom: 10px;">
        <div class="changelog-header">v1.0.0 - Wordle Released - 3/23/2026</div>
        <li class="innerli">Initial release of Wordle on Gamebar</li>
        </details>`,
        game: 'Wordle',
        preview: `<img id="previewImg" src="/wordle/wordlepreview.png" alt="Wordle Preview" height="500">`,
        playButton: `<button id="button" onclick="play()">Play</button>`,
        guide: 'Try to guess a random 5 letter word in 6 guesses or less! If any of the letters of your guess turn teal, that letter is in the correct spot. If the letter turns yellow, the word contains that letter, but it is not in the correct spot. If the letter turns to a faded green, the letter is not in the word. Good luck!<br><br>Note: Box colors are janky right now, will be fixed in the future.',
        specifics: `<details>
        <summary class="summaries">Specifics</summary>
        <hr style="border: solid 1px #4d664d; margin-top: 5px; margin-bottom: 10px;">
                <h3>Wordified Logic:</h3>
                <li class="innerli">Game starts, form area drawn</li>
                <li class="innerli">Server retrieves dictionary, and sends a random 5 letter word from it to the client</li>
                <li class="innerli">Player submits guess, game checks if it matches the random word</li>
                <li class="innerli">If the word matches, the player wins. Otherwise, letters are color-coded to show guess accuracy</li>
                <li class="innerli">Player gets 6 total guesses to find the word. If they fail, they lose and the correct word is revealed</li>

                </details>
        </details>`,
    };
    res.render('page', { user: req.session.user, gp: req.session.gp, cost: 20, pageName: 'Gamebar', version: 'v0.3.4', data: data });
});

app.get('/game_2048', isAuthenticated, (req, res) => {
    if (!paid) {
        // if the user hasn't paid, send user back to home page
        res.render('index', { user: req.session.user, gp: req.session.gp, pageName: 'Gamebar', version: 'v0.3.4' });
    } else {
        res.render('games/2048/game_2048', { user: req.session.user, gp: req.session.gp, pageName: '2048', version: 'v1.0.2' });
    }
});

app.get('/game_snake', isAuthenticated, (req, res) => {
    if (!paid) {
        // if the user hasn't paid, send user back to home page
        res.render('index', { user: req.session.user, gp: req.session.gp, pageName: 'Gamebar', version: 'v0.3.4' });
    } else {
        res.render('games/snake/game_snake', { user: req.session.user, gp: req.session.gp, pageName: 'Snake', version: 'v1.0.1' });
    }
});

app.get('/game_stack', isAuthenticated, (req, res) => {
    if (!paid) {
        // if the user hasn't paid, send user back to home page
        res.render('index', { user: req.session.user, gp: req.session.gp, pageName: 'Gamebar', version: 'v0.3.4' });
    } else {
        res.render('games/stack/game_stack', { user: req.session.user, gp: req.session.gp, pageName: 'Stack', version: 'v1.0.0' });
    }
});

app.get('/game_alchemy', isAuthenticated, (req, res) => {
    if (!paid) {
        // if the user hasn't paid, send user back to home page
        res.render('index', { user: req.session.user, gp: req.session.gp, pageName: 'Gamebar', version: 'v0.3.4' });
    } else {
        res.render('games/alchemy/game_alchemy', { user: req.session.user, gp: req.session.gp, pageName: 'Alchemy', version: 'v1.1.1' });
    }
});

app.get('/game_wordle', isAuthenticated, (req, res) => {
    if (!paid) {
        // if the user hasn't paid, send user back to home page
        res.render('index', { user: req.session.user, gp: req.session.gp, pageName: 'Gamebar', version: 'v0.3.4' });
    } else {
        res.render('games/wordle/game_wordle', { user: req.session.user, gp: req.session.gp, pageName: 'Wordle', version: 'v1.0.0' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// SOCKET ROUTES

var socketReturn = false;
io.on('connection', (socket) => {
    // DIGIPOG TRANSFERS
    // ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
    authSocket.on("transferResponse", (response) => {
        console.log("Transfer Response:", response);
        socketReturn = response.success;
    });

    socket.on('transaction', (pin, amount, reward, user) => {
        const data = {
            from: clientID,
            to: 49,
            amount: amount,
            reason: 'Gamebar Transaction',
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
                    socket.emit('transactionSuccess');
                });
            }
        }, 1000);
    });

    socket.on('playGame', (data) => {
        let user = data.user;
        let cost = parseInt(data.cost);
        let game = data.game.toLowerCase();
        console.log('Play Game Data:', data);
        console.log(`User ${user} is attempting to play ${game} that costs ${cost} GP.`);

        db.get(`SELECT CONVEERT(str, ${game}) FROM onetime WHERE user_id = (SELECT id FROM users WHERE username = ?)`, [user], (err, row) => {
            if (err) {
                console.error(`The game ${game} is not in the onetime table, or there was an error retrieving it. Continuing as a normal game.`);
                //if the game is not in the onetime table, proceed with normal transaction
                return db.get('SELECT gp FROM users WHERE username = ?', [user], (err, row) => {
                    if (err) {
                        return console.error(err.message);
                    }

                    if (row.gp < cost) {
                        socket.emit('insufficientFunds', cost);
                    } else {
                        socket.emit('confirmCost', cost);

                        socket.on('confirmPlay', () => {
                            db.run('UPDATE users SET gp = gp - ? WHERE username = ?', [cost, user], function (err) {
                                if (err) {
                                    return console.error(err.message);
                                }
                                paid = true;
                                socket.emit('relocate');
                            });
                        });
                    }
                });
            }

            //if the game is in the onetime table, check if the user has already paid for it
            if (row && row[game] === 1) {
                //game is already paid for, skip GP deduction
                console.log(`User ${user} has already paid for the onetime game ${game}.`);
                paid = true;
                socket.emit('onetimePaid');
            } else if (row && row[game] === 0) {
                //check if the user has enough gp
                db.get('SELECT gp FROM users WHERE username = ?', [user], (err, row) => {
                    if (err) {
                        return console.error(err.message);
                    }

                    if (row.gp < cost) {
                        socket.emit('insufficientFunds');
                    } else {
                        // Deduct GP and update the onetime table if necessary
                        socket.emit('confirmCost', cost);

                        socket.on('confirmPlay', () => {
                            db.run('UPDATE users SET gp = gp - ? WHERE username = ?', [cost, user], function (err) {
                                if (err) {
                                    return console.error(err.message);
                                }

                                // Update the onetime table if the game exists
                                db.run(`UPDATE onetime SET ${game} = 1 WHERE user_id = (SELECT id FROM users WHERE username = ?)`, [user], function (err) {
                                    if (err) {
                                        return console.error(err.message);
                                    }
                                    console.log(`Set user ${user} as having paid for onetime game ${game}.`);
                                });

                                // Allow relocate to function properly
                                paid = true;
                                socket.emit('relocate');
                            });
                        });
                    }
                });
            } else {
                console.log('something went wrong')
            }
        });
    });

    //on unload, set paid back to false, preventing users from just refreshing the page to play games for free
    socket.on('leaveGame', () => {
        paid = false;
    });

    // GAMES' SERVERSIDE LOGIC
    // ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓


    // WORDLE

    socket.on('getDictionary', () => {
        var dictionary = [];
        for (let i = 97; i <= 122; i++) {
            const letter = String.fromCharCode(i);
            datamuse.request(`words?sp=${letter}????&max=1000`)
                .then((json) => {
                    let wordleArray = json
                    wordleArray.forEach(wordObject => {
                        word = wordObject.word;
                        if (word.length === 5 && /^[a-zA-Z]+$/.test(word)) {
                            word = word.toUpperCase();
                            dictionary.push(word);
                        }
                    });
                });
            if (i === 122) {
                setTimeout(() => {
                    socket.emit('dictReturn', dictionary);
                }, 2000);
            }
        };
    });

    // ALCHEMY
    socket.on('getElements', () => {
        function Element(name, text, category, recipe, locked) {
            this.name = name;
            this.text = text;
            this.category = category;
            this.recipe = recipe;
            this.locked = locked;
        }

        let returnDict = [
            new Element("Fire", "🔥 Fire", "defaults", [], false),
            new Element("Water", "💧 Water", "defaults", [], false),
            new Element("Air", "🌬️ Air", "defaults", [], false),
            new Element("Earth", "🌍 Earth", "defaults", [], false),
            new Element("Steam", "💨 Steam", "nature", ["Fire", "Water"], true),
            new Element("Smoke", "💨 Smoke", "nature", ["Fire", "Air"], true),
            new Element("Wind", "🌬️ Wind", "nature", ["Air", "Air"], true),
            new Element("Mud", "💩 Mud", "nature", ["Water", "Earth"], true),
            new Element("Lava", "🌋 Lava", "nature", ["Fire", "Earth"], true),
            new Element("Mountain", "⛰️ Mountain", "nature", ["Earth", "Earth"], true),
            new Element("Volcano", "🌋 Volcano", "nature", ["Lava", "Mountain"], true),
            new Element("Geyser", "💨 Geyser", "nature", ["Volcano", "Water"], true),
            new Element("Air Bubble", "🫧 Air Bubble", "nature", ["Air", "Water"], true),
            new Element("Lake", "🌊 Lake", "nature", ["Water", "Water"], true),
            new Element("Sea", "🌊 Sea", "nature", ["Lake", "Lake"], true),
            new Element("Ocean", "🌊 Ocean", "nature", ["Sea", "Sea"], true),
            new Element("Wave", "🌊 Wave", "nature", ["Ocean", "Wind"], true),
            new Element("Tsunami", "🌊 Tsunami", "nature", ["Wave", "Wave"], true),
            new Element("Cloud", "☁️ Cloud", "nature", ["Air", "Steam"], true),
            new Element("Rain", "🌧️ Rain", "nature", ["Cloud", "Water"], true),
            new Element("Fog", "🌫️ Fog", "nature", ["Cloud", "Earth"], true),
            new Element("Plant", "🌱 Plant", "nature", ["Earth", "Rain"], true),
            new Element("Tree", "🌳 Tree", "nature", ["Plant", "Plant"], true),
            new Element("Forest", "🌳 Forest", "nature", ["Tree", "Tree"], true),
            new Element("Grass", "🌱 Grass", "nature", ["Earth", "Plant"], true),
            new Element("Bush", "🌳 Bush", "nature", ["Tree", "Grass"], true),
            new Element("Dust", "🌫️ Dust", "nature", ["Wind", "Earth"], true),
            new Element("Sand", "⛱️ Sand", "nature", ["Earth", "Dust"], true),
            new Element("Beach", "🏖️ Beach", "nature", ["Sand", "Ocean"], true),
            new Element("Rock", "🪨 Rock", "nature", ["Sand", "Sand"], true),
            new Element("Stone", "🪨 Stone", "nature", ["Rock", "Rock"], true),
            new Element("Brick", "🧱 Brick", "humanInnovation", ["Mud", "Fire"], true),
            new Element("Brick Wall", "🧱 Brick Wall", "humanInnovation", ["Brick", "Brick"], true),
            new Element("Glass", "🪟 Glass", "humanInnovation", ["Sand", "Fire"], true),
            new Element("Storm", "🌩️ Storm", "nature", ["Rain", "Wind"], true),
            new Element("Lightning", "⚡ Lightning", "nature", ["Storm", "Air"], true),
            new Element("Hurricane", "🌀 Hurricane", "nature", ["Storm", "Storm"], true),
            new Element("Tornado", "🌪️ Tornado", "nature", ["Wind", "Wind"], true),
            new Element("Sky", "🪟 Sky", "nature", ["Air", "Cloud"], true),
            new Element("Weather", "⛅ Weather", "nature", ["Sky", "Storm"], true),
            new Element("Space", "🌌 Space", "space", ["Sky", "Sky"], true),
            new Element("Star", "🌟 Star", "space", ["Fire", "Space"], true),
            new Element("Moon", "🌙 Moon", "space", ["Earth", "Space"], true),
            new Element("Eclipse", "🌒 Eclipse", "space", ["Sun", "Moon"], true),
            new Element("Sun", "☀️ Sun", "nature", ["Sky", "Star"], true),
            new Element("Rainbow", "🌈 Rainbow", "nature", ["Sun", "Rain"], true),
            new Element("House", "🏠 House", "humanInnovation", ["Brick Wall", "Glass"], true),
            new Element("Town", "🏘️ Town", "humanInnovation", ["House", "House"], true),
            new Element("City", "🏙️ City", "humanInnovation", ["Town", "Town"], true),
            new Element("Skyscraper", "🏢 Skyscraper", "humanInnovation", ["Sky", "City"], true),
            new Element("Factory", "🏭 Factory", "humanInnovation", ["City", "Metal"], true),
            new Element("Door", "🚪 Door", "humanInnovation", ["Wood", "House"], true),
            new Element("Window", "🪟 Window", "humanInnovation", ["Glass", "House"], true),
            new Element("Leather", "👞 Leather", "humanInnovation", ["Cow", "Factory"], true),
            new Element("Book", "📕 Book", "humanInnovation", ["Leather", "Paper"], true),
            new Element("Library", "📚 Library", "humanInnovation", ["Book", "House"], true),
            new Element("Planet", "🪐 Planet", "space", ["Moon", "Moon"], true),
            new Element("Solar System", "💫 Solar System", "space", ["Star", "Planet"], true),
            new Element("Black Hole", "⚫ Black Hole", "space", ["Star", "Star"], true),
            new Element("Galaxy", "🌌 Galaxy", "space", ["Solar System", "Solar System"], true),
            new Element("Meteor", "🌠 Meteor", "space", ["Stone", "Space"], true),
            new Element("Shooting Star", "🌠 Shooting Star", "space", ["Energy", "Meteor"], true),
            new Element("Lonsdaleite", "💎 Lonsdaleite", "space", ["Diamond", "Meteor"], true),
            new Element("Universe", "🌌 Universe", "space", ["Galaxy", "Galaxy"], true),
            new Element("Energy", "💡 Energy", "science", ["City", "Lightning"], true),
            new Element("Electricity", "⚡ Electricity", "science", ["Energy", "Lightning"], true),
            new Element("Gravity", "⚫ Gravity", "science", ["Space", "Energy"], true),
            new Element("Pressure", "💥 Pressure", "science", ["Air", "Gravity"], true),
            new Element("Life", "🧬 Life", "science", ["Plant", "Energy"], true),
            new Element("Bacteria", "🦠 Bacteria", "science", ["Life", "Life"], true),
            new Element("Human", "🙍 Human", "animals", ["Earth", "Life"], true),
            new Element("Love", "💘 Love", "feelingsTraits", ["Human", "Human"], true),
            new Element("Heartbreak", "💔 Heartbreak", "feelingsTraits", ["Love", "Pressure"], true),
            new Element("Baby", "👶 Baby", "nature", ["Human", "Love"], true),
            new Element("Family", "👪 Family", "nature", ["Human", "Baby"], true),
            new Element("Boy", "👦 Boy", "nature", ["Man", "Baby"], true),
            new Element("Girl", "👧 Girl", "nature", ["Woman", "Baby"], true),
            new Element("Marriage", "💍 Marriage", "humanInnovation", ["Love", "Ring"], true),
            new Element("Citizen", "🙍 Citizen", "humanInnovation", ["Human", "City"], true),
            new Element("Community", "📢 Community", "humanInnovation", ["City", "Love"], true),
            new Element("Party", "🎉 Party", "humanInnovation", ["Community", "Fun"], true),
            new Element("Settlement", "🏡 Settlement", "humanInnovation", ["Human", "Earth"], true),
            new Element("Colony", "🐜 Colony", "humanInnovation", ["Settlement", "Town"], true),
            new Element("Country", "🏙️ Country", "humanInnovation", ["Colony", "Colony"], true),
            new Element("Continent", "🌎 Continent", "nature", ["Country", "Earth"], true),
            new Element("Island", "🏝️ Island", "nature", ["Earth", "Ocean"], true),
            new Element("Palm Tree", "🌴 Palm Tree", "nature", ["Tree", "Island"], true),
            new Element("Light", "💡 Light", "science", ["Sun", "Sky"], true),
            new Element("Flashlight", "🔦 Flashlight", "humanInnovation", ["Light", "Tool"], true),
            new Element("Lighthouse", "💡 Lighthouse", "humanInnovation", ["Light", "Ocean"], true),
            new Element("Lightbulb", "💡 Lightbulb", "humanInnovation", ["Glass", "Light"], true),
            new Element("Idea", "💡 Idea", "humanInnovation", ["Human", "Lightbulb"], true),
            new Element("Thomas Edison", "🧠 Thomas Edison", "notableFigures", ["Idea", "Lightbulb"], true),
            new Element("Oxygen", "💨 Oxygen", "science", ["Life", "Air"], true),
            new Element("Alien", "👽 Alien", "space", ["Life", "Space"], true),
            new Element("Astronaut", "🧑‍🚀 Astronaut", "occupations", ["Human", "Space"], true),
            new Element("UFO", "🛸 UFO", "space", ["Alien", "Space"], true),
            new Element("Cold", "🥶 Cold", "science", ["Air", "Sky"], true),
            new Element("Ice", "🧊 Ice", "nature", ["Cold", "Water"], true),
            new Element("Snow", "❄️ Snow", "nature", ["Ice", "Rain"], true),
            new Element("Snowstorm", "🌨️ Snowstorm", "nature", ["Snow", "Storm"], true),
            new Element("Heat", "🥵 Heat", "science", ["Fire", "Cold"], true),
            new Element("Wildfire", "🔥 Wildfire", "nature", ["Fire", "Forest"], true),
            new Element("Dust Devil", "🌪️ Dust Devil", "nature", ["Dust", "Tornado"], true),
            new Element("Waterspout", "🌊 Waterspout", "nature", ["Ocean", "Tornado"], true),
            new Element("Blizzard", "🌨️ Blizzard", "nature", ["Snowstorm", "Wind"], true),
            new Element("Iceberg", "🧊 Iceberg", "nature", ["Ice", "Ocean"], true),
            new Element("Tool", "🔨 Tool", "humanInnovation", ["Human", "Stone"], true),
            new Element("Axe", "🪓 Axe", "humanInnovation", ["Tool", "Tree"], true),
            new Element("Lumberjack", "🪚 Lumberjack", "occupations", ["Human", "Axe"], true),
            new Element("Wood", "🪵 Wood", "nature", ["Tree", "Lumberjack"], true),
            new Element("Pickaxe", "⛏️ Pickaxe", "humanInnovation", ["Tool", "Stone"], true),
            new Element("Miner", "⛏️ Miner", "occupations", ["Pickaxe", "Human"], true),
            new Element("Ore", "🪨 Ore", "nature", ["Miner", "Stone"], true),
            new Element("Metal", "⚒️ Metal", "nature", ["Ore", "Fire"], true),
            new Element("Cabin", "🛖 Cabin", "humanInnovation", ["Forest", "House"], true),
            new Element("Castle", "🏰 Castle", "humanInnovation", ["Stone", "House"], true),
            new Element("King", "🤴 King", "occupations", ["Castle", "Human"], true),
            new Element("Kingdom", "🏰 Kingdom", "humanInnovation", ["King", "City"], true),
            new Element("Royalty", "👑 Royalty", "humanInnovation", ["Castle", "Kingdom"], true),
            new Element("Serf", "🧑‍🌾 Serf", "occupations", ["Kingdom", "Human"], true),
            new Element("Arctic", "🧊 Arctic", "nature", ["Ice", "Earth"], true),
            new Element("Antarctica", "🧊 Antarctica", "nature", ["Arctic", "Continent"], true),
            new Element("Desert", "🏜️ Desert", "nature", ["Sand", "Sun"], true),
            new Element("Jungle", "🌳 Jungle", "nature", ["Forest", "Plant"], true),
            new Element("Rainforest", "🌳 Rainforest", "nature", ["Jungle", "Rain"], true),
            new Element("Grassland", "🌾 Grassland", "nature", ["Grass", "Earth"], true),
            new Element("Savannah", "🌾 Savannah", "nature", ["Grassland", "Desert"], true),
            new Element("Marsh", "🌱 Marsh", "nature", ["Water", "Mud"], true),
            new Element("Swamp", "🌴 Swamp", "nature", ["Marsh", "Tree"], true),
            new Element("Prairie", "🌾 Prairie", "nature", ["Grassland", "Wildfire"], true),
            new Element("Bear", "🐻 Bear", "animals", ["Forest", "Life"], true),
            new Element("Polar Bear", "🐻‍❄️ Polar Bear", "animals", ["Arctic", "Bear"], true),
            new Element("Goat", "🐐 Goat", "animals", ["Mountain", "Life"], true),
            new Element("Cow", "🐄 Cow", "animals", ["Grass", "Life"], true),
            new Element("Milk", "🥛 Milk", "foodDrink", ["Human", "Cow"], true),
            new Element("Pig", "🐖 Pig", "animals", ["Mud", "Life"], true),
            new Element("Fish", "🐟 Fish", "animals", ["Ocean", "Life"], true),
            new Element("Goldfish", "🐠 Goldfish", "animals", ["Fish", "Gold"], true),
            new Element("Blowfish", "🐡 Blowfish", "animals", ["Fish", "Air"], true),
            new Element("Squid", "🦑 Squid", "animals", ["Ink", "Fish"], true),
            new Element("Crab", "🦀 Crab", "animals", ["Beach", "Life"], true),
            new Element("Bird", "🐦 Bird", "animals", ["Sky", "Life"], true),
            new Element("Parrot", "🦜 Parrot", "animals", ["Jungle", "Bird"], true),
            new Element("Toucan", "🦜 Toucan", "animals", ["Rainforest", "Bird"], true),
            new Element("Duck", "🦆 Duck", "animals", ["Lake", "Bird"], true),
            new Element("Vulture", "🦅 Vulture", "animals", ["Desert", "Bird"], true),
            new Element("Crow", "🐦‍⬛ Crow", "animals", ["Death", "Bird"], true),
            new Element("Pigeon", "🕊️ Pigeon", "animals", ["City", "Bird"], true),
            new Element("Penguin", "🐧 Penguin", "animals", ["Antarctica", "Bird"], true),
            new Element("Chicken", "🐔 Chicken", "animals", ["Farm", "Bird"], true),
            new Element("Cactus", "🌵 Cactus", "nature", ["Desert", "Plant"], true),
            new Element("Snake", "🐍 Snake", "animals", ["Desert", "Life"], true),
            new Element("Viper", "🐍 Viper", "animals", ["Snake", "Poison"], true),
            new Element("Monkey", "🐒 Monkey", "animals", ["Jungle", "Life"], true),
            new Element("Gorilla", "🦍 Gorilla", "animals", ["Monkey", "Monkey"], true),
            new Element("Horse", "🐎 Horse", "animals", ["Grassland", "Life"], true),
            new Element("Unicorn", "🦄 Unicorn", "mythology", ["Horse", "Magic"], true),
            new Element("Pegasus", "🦄 Pegasus", "mythology", ["Horse", "Sky"], true),
            new Element("Zebra", "🦓 Zebra", "animals", ["Horse", "Savannah"], true),
            new Element("Llama", "🦙 Llama", "animals", ["Mountain", "Horse"], true),
            new Element("Donkey", "🫏 Donkey", "animals", ["Mud", "Horse"], true),
            new Element("Mule", "🫏 Mule", "animals", ["Donkey", "Horse"], true),
            new Element("Deer", "🦌 Deer", "animals", ["Horse", "Forest"], true),
            new Element("Reindeer", "🦌 Reindeer", "animals", ["Deer", "Arctic"], true),
            new Element("Camel", "🐫 Camel", "animals", ["Desert", "Horse"], true),
            new Element("Mouse", "🐁 Mouse", "animals", ["House", "Life"], true),
            new Element("Rat", "🐀 Rat", "animals", ["City", "Mouse"], true),
            new Element("Rabbit", "🐇 Rabbit", "animals", ["Grass", "Mouse"], true),
            new Element("Squirrel", "🐿️ Squirrel", "animals", ["Tree", "Mouse"], true),
            new Element("Prairie Dog", "🐿️ Prairie Dog", "animals", ["Prairie", "Mouse"], true),
            new Element("Bug", "🐞 Bug", "animals", ["Plant", "Life"], true),
            new Element("Ant", "🐜 Ant", "animals", ["Colony", "Bug"], true),
            new Element("Fly", "🪰 Fly", "animals", ["Bug", "Air"], true),
            new Element("Butterfly", "🦋 Butterfly", "animals", ["Fly", "Flower"], true),
            new Element("Moth", "🦋 Moth", "animals", ["Butterfly", "Darkness"], true),
            new Element("Silk Moth", "🦋 Silk Moth", "animals", ["Moth", "Tree"], true),
            new Element("Silk", "🧵 Silk", "humanInnovation", ["Silk Moth", "Human"], true),
            new Element("Spider", "🕷️ Spider", "animals", ["Bug", "Silk"], true),
            new Element("Farmer", "🧑‍🌾 Farmer", "occupations", ["Human", "Grassland"], true),
            new Element("Corn", "🌽 Corn", "nature", ["Farmer", "Grassland"], true),
            new Element("Wheat", "🌾 Wheat", "nature", ["Farmer", "Grass"], true),
            new Element("Lizard", "🦎 Lizard", "animals", ["Rock", "Life"], true),
            new Element("Crocodile", "🐊 Crocodile", "animals", ["Swamp", "Life"], true),
            new Element("Frog", "🐸 Frog", "animals", ["Marsh", "Life"], true),
            new Element("Phoenix", "🐦‍🔥 Phoenix", "mythology", ["Fire", "Bird"], true),
            new Element("Dragon", "🐉 Dragon", "mythology", ["Fire", "Lizard"], true),
            new Element("Knight", "⚔️ Knight", "occupations", ["Kingdom", "Dragon"], true),
            new Element("Sword", "⚔️ Sword", "humanInnovation", ["Knight", "Tool"], true),
            new Element("Shield", "🛡️ Shield", "humanInnovation", ["Knight", "Castle"], true),
            new Element("Magic", "🪄 Magic", "mythology", ["Energy", "Kingdom"], true),
            new Element("Wizard", "🧙 Wizard", "mythology", ["Magic", "Human"], true),
            new Element("Pirate", "🏴‍☠️ Pirate", "occupations", ["Parrot", "Human"], true),
            new Element("Titanic", "🚢 Titanic", "notableFigures", ["Ship", "Iceberg"], true),
            new Element("Captain", "🏴‍☠️ Captain", "occupations", ["Pirate", "Ship"], true),
            new Element("Steam Engine", "💨 Steam Engine", "humanInnovation", ["Metal", "Steam"], true),
            new Element("Vehicle", "⚙️ Vehicle", "humanInnovation", ["Metal", "Steam Engine"], true),
            new Element("Car", "🚗 Car", "humanInnovation", ["Vehicle", "City"], true),
            new Element("Ship", "🚢 Ship", "humanInnovation", ["Vehicle", "Ocean"], true),
            new Element("Steamboat", "🚢 Steamboat", "humanInnovation", ["Steam Engine", "Ship"], true),
            new Element("Airplane", "✈️ Airplane", "humanInnovation", ["Vehicle", "Sky"], true),
            new Element("Rocket", "🚀 Rocket", "humanInnovation", ["Vehicle", "Space"], true),
            new Element("Train", "🚂 Train", "humanInnovation", ["Car", "Coal"], true),
            new Element("Accident", "💥 Accident", "humanInnovation", ["Car", "Fog"], true),
            new Element("Road", "🛣️ Road", "humanInnovation", ["Car", "City"], true),
            new Element("Highway", "🛣️ Highway", "humanInnovation", ["Road", "Road"], true),
            new Element("Pilot", "🧑‍✈️ Pilot", "occupations", ["Airplane", "Human"], true),
            new Element("Charcoal", "🔥 Charcoal", "nature", ["Wood", "Fire"], true),
            new Element("Gunpowder", "💥 Gunpowder", "humanInnovation", ["Charcoal", "Sand"], true),
            new Element("Gun", "🔫 Gun", "humanInnovation", ["Gunpowder", "Metal"], true),
            new Element("Rocket Launcher", "🚀 Rocket Launcher", "humanInnovation", ["Gun", "Rocket"], true),
            new Element("Earthquake", "🫨 Earthquake", "nature", ["Earth", "Energy"], true),
            new Element("Oil Rig", "🛢️ Oil Rig", "humanInnovation", ["Desert", "Metal"], true),
            new Element("Oil", "🛢️ Oil", "nature", ["Oil Rig", "Earth"], true),
            new Element("Coal", "🔥 Coal", "nature", ["Oil", "Pressure"], true),
            new Element("Diamond", "💎 Diamond", "nature", ["Coal", "Pressure"], true),
            new Element("Ring", "💍 Ring", "humanInnovation", ["Diamond", "Metal"], true),
            new Element("Chef", "🧑‍🍳 Chef", "occupations", ["Human", "Fire"], true),
            new Element("Beef", "🍔 Beef", "foodDrink", ["Cow", "Axe"], true),
            new Element("Steak", "🥩 Steak", "foodDrink", ["Chef", "Beef"], true),
            new Element("Pork", "🍖 Pork", "foodDrink", ["Pig", "Axe"], true),
            new Element("Grease", "🛢️ Grease", "nature", ["Pork", "Fire"], true),
            new Element("Bacon", "🥓 Bacon", "foodDrink", ["Grease", "Pork"], true),
            new Element("Flower", "🌼 Flower", "nature", ["Plant", "Light"], true),
            new Element("Sunflower", "🌻 Sunflower", "nature", ["Flower", "Sun"], true),
            new Element("Dandelion", "🌼 Dandelion", "nature", ["Flower", "Wind"], true),
            new Element("Bee", "🐝 Bee", "animals", ["Flower", "Life"], true),
            new Element("Pollen", "🌼 Pollen", "nature", ["Bee", "Flower"], true),
            new Element("Honey", "🍯 Honey", "foodDrink", ["Bee", "Pollen"], true),
            new Element("Fruit", "🍎 Fruit", "nature", ["Flower", "Pollen"], true),
            new Element("Juice", "🧃 Juice", "foodDrink", ["Fruit", "Water"], true),
            new Element("Apple", "🍏 Apple", "foodDrink", ["Fruit", "Tree"], true),
            new Element("Citrus Orange", "🍊 Citrus Orange", "foodDrink", ["Fruit", "Orange"], true),
            new Element("Berries", "🫐 Berries", "foodDrink", ["Bush", "Fruit"], true),
            new Element("Apple Juice", "🧃 Apple Juice", "foodDrink", ["Apple", "Juice"], true),
            new Element("Coffee Beans", "☕ Coffee Beans", "nature", ["Fruit", "Energy"], true),
            new Element("Coffee", "☕ Coffee", "foodDrink", ["Coffee Beans", "Water"], true),
            new Element("Mango", "🥭 Mango", "foodDrink", ["Fruit", "Jungle"], true),
            new Element("Coconut", "🥥 Coconut", "foodDrink", ["Fruit", "Palm Tree"], true),
            new Element("Tea", "🍵 Tea", "foodDrink", ["Flower", "Water"], true),
            new Element("Eruption", "🌋 Eruption", "nature", ["Volcano", "Earthquake"], true),
            new Element("Lucifer", "😈 Lucifer", "mythology", ["Apple", "Snake"], true),
            new Element("Eve", "🍎 Eve", "mythology", ["Lucifer", "Human"], true),
            new Element("Forbidden Fruit", "🍎 Forbidden Fruit", "mythology", ["Eve", "Fruit"], true),
            new Element("Adam", "🍎 Adam", "mythology", ["Eve", "Love"], true),
            new Element("Man", "🙍‍♂️ Man", "nature", ["Adam", "Human"], true),
            new Element("Woman", "🙍‍♀️ Woman", "nature", ["Eve", "Human"], true),
            new Element("Vine", "🌱 Vine", "nature", ["Jungle", "Plant"], true),
            new Element("Grapes", "🍇 Grapes", "foodDrink", ["Vine", "Fruit"], true),
            new Element("Wine", "🍷 Wine", "foodDrink", ["Grapes", "Alcohol"], true),
            new Element("Sugar", "🍰 Sugar", "foodDrink", ["Honey", "Air"], true),
            new Element("Sugar Cane", "🎋 Sugar Cane", "nature", ["Sugar", "Plant"], true),
            new Element("Windmill", "💨 Windmill", "humanInnovation", ["Wind", "House"], true),
            new Element("Flour", "🌾 Flour", "foodDrink", ["Windmill", "Wheat"], true),
            new Element("Yeast", "🍄‍🟫 Yeast", "nature", ["Sugar", "Wheat"], true),
            new Element("Baker", "🧑‍🍳 Baker", "occupations", ["Yeast", "Chef"], true),
            new Element("Bakery", "🧁 Bakery", "humanInnovation", ["Baker", "House"], true),
            new Element("Bread", "🍞 Bread", "foodDrink", ["Flour", "Baker"], true),
            new Element("Cake", "🎂 Cake", "foodDrink", ["Baker", "Sugar"], true),
            new Element("Alcohol", "🍺 Alcohol", "foodDrink", ["Yeast", "Sugar"], true),
            new Element("Beer", "🍺 Beer", "foodDrink", ["Alcohol", "Human"], true),
            new Element("Cocktail", "🍸 Cocktail", "foodDrink", ["Beer", "Fruit"], true),
            new Element("Margarita", "🍹 Margarita", "foodDrink", ["Cocktail", "Salt"], true),
            new Element("Salt", "🧂 Salt", "foodDrink", ["Sea", "Fire"], true),
            new Element("Cowboy", "🤠 Cowboy", "occupations", ["Desert", "Horse"], true),
            new Element("Wild West", "🤠 Wild West", "notableFigures", ["Cowboy", "Earth"], true),
            new Element("Revolver", "🔫 Revolver", "humanInnovation", ["Wild West", "Gun"], true),
            new Element("Lasso", "🤠 Lasso", "humanInnovation", ["Cowboy", "Tool"], true),
            new Element("Rancher", "🧑‍🌾 Rancher", "occupations", ["Farmer", "Lasso"], true),
            new Element("Farm", "🌽 Farm", "humanInnovation", ["Farmer", "Earth"], true),
            new Element("Barn", "🏡 Barn", "humanInnovation", ["Farm", "House"], true),
            new Element("Stable", "🐎 Stable", "humanInnovation", ["Barn", "Horse"], true),
            new Element("Horsehoe", "🐎 Horseshoe", "humanInnovation", ["Horse", "Metal"], true),
            new Element("Horse Racing", "🏇 Horse Racing", "media", ["Horse", "Entertainment"], true),
            new Element("Umamusume", "🏇 Umamusume", "media", ["Horse Racing", "Girl"], true),
            new Element("Centaur", "🧑‍🌾 Centaur", "mythology", ["Human", "Horse"], true),
            new Element("Silo", "🌽 Silo", "humanInnovation", ["Corn", "Barn"], true),
            new Element("Hoe", "🧑‍🌾 Hoe", "humanInnovation", ["Farmer", "Tool"], true),
            new Element("Death", "💀 Death", "science", ["Life", "Time"], true),
            new Element("Ghost", "👻 Ghost", "mythology", ["Death", "Human"], true),
            new Element("Poltergeist", "👻 Poltergeist", "mythology", ["Ghost", "Energy"], true),
            new Element("Ressurection", "🪦 Ressurection", "mythology", ["Hell", "Death"], true),
            new Element("Zombie", "🧟 Zombie", "mythology", ["Ressurection", "Human"], true),
            new Element("Necromancer", "🧙 Necromancer", "mythology", ["Death", "Wizard"], true),
            new Element("Lich", "🧟 Lich", "mythology", ["Necromancer", "Zombie"], true),
            new Element("Hell", "🔥 Hell", "mythology", ["Lucifer", "Death"], true),
            new Element("Demon", "👹 Demon", "mythology", ["Hell", "Life"], true),
            new Element("God", "🌟 God", "mythology", ["Universe", "Life"], true),
            new Element("Heaven", "🪽 Heaven", "mythology", ["God", "Death"], true),
            new Element("Angel", "😇 Angel", "mythology", ["Heaven", "Life"], true),
            new Element("Sin", "😈 Sin", "mythology", ["Human", "Demon"], true),
            new Element("Chupacabra", "🐐 Chupacabra", "mythology", ["Hell", "Goat"], true),
            new Element("Bigfoot", "🦍 Bigfoot", "mythology", ["Gorilla", "Forest"], true),
            new Element("Sasquatch", "🦍 Sasquatch", "mythology", ["Bigfoot", "Mountain"], true),
            new Element("Yeti", "🦍 Yeti", "mythology", ["Bigfoot", "Snow"], true),
            new Element("Harambe", "🦍 Harambe", "notableFigures", ["Gorilla", "Gun"], true),
            new Element("Clock", "⌚ Clock", "humanInnovation", ["Sun", "Human"], true),
            new Element("Time", "⏳ Time", "science", ["Clock", "God"], true),
            new Element("Gem", "💎 Gem", "nature", ["Diamond", "Ore"], true),
            new Element("Crystal", "💎 Crystal", "nature", ["Gem", "Glass"], true),
            new Element("Geode", "🪨 Geode", "nature", ["Gem", "Stone"], true),
            new Element("Chisel", "🔨 Chisel", "humanInnovation", ["Geode", "Tool"], true),
            new Element("Quartz", "💎 Quartz", "nature", ["Geode", "Gem"], true),
            new Element("Amethyst", "💎 Amethyst", "nature", ["Quartz", "Purple"], true),
            new Element("Rose Quartz", "💎 Rose Quartz", "nature", ["Quartz", "Pink"], true),
            new Element("Citrine", "💎 Citrine", "nature", ["Quartz", "Yellow"], true),
            new Element("Ametrine", "💎 Ametrine", "nature", ["Quartz", "Amethyst"], true),
            new Element("Smoky Quartz", "💎 Smoky Quartz", "nature", ["Quartz", "Gray"], true),
            new Element("Milky Quartz", "💎 Milky Quartz", "nature", ["Quartz", "White"], true),
            new Element("Prasiolite", "💎 Prasiolite", "nature", ["Quartz", "Green"], true),
            new Element("Emerald", "💎 Emerald", "nature", ["Mercury", "Gem"], true),
            new Element("Moonga", "💎 Moonga", "nature", ["Mars", "Gem"], true),
            new Element("Yellow Sapphire", "💎 Yellow Sapphire", "nature", ["Jupiter", "Gem"], true),
            new Element("Blue Sapphire", "💎 Blue Sapphire", "nature", ["Saturn", "Gem"], true),
            new Element("Ruby", "💎 Ruby", "nature", ["Confidence", "Gem"], true),
            new Element("Garnet", "💎 Garnet", "nature", ["Lava", "Gem"], true),
            new Element("Moonstone", "💎 Moonstone", "nature", ["Moon", "Gem"], true),
            new Element("Sunstone", "💎 Sunstone", "nature", ["Sun", "Gem"], true),
            new Element("Paper", "📜 Paper", "humanInnovation", ["Wood", "Chisel"], true),
            new Element("Ash", "🔥 Ash", "nature", ["Paper", "Fire"], true),
            new Element("Obsidian", "🔥 Obsidian", "nature", ["Lava", "Water"], true),
            new Element("Radiation", "☢️ Radiation", "science", ["Heat", "Light"], true),
            new Element("Uranium", "☢️ Uranium", "nature", ["Radiation", "Metal"], true),
            new Element("Mercury", "🪐 Mercury", "space", ["Sun", "Planet"], true),
            new Element("Venus", "🪐 Venus", "space", ["Planet", "Volcano"], true),
            new Element("Mars", "🪐 Mars", "space", ["Planet", "Radiation"], true),
            new Element("Jupiter", "🪐 Jupiter", "space", ["Planet", "Storm"], true),
            new Element("Saturn", "🪐 Saturn", "space", ["Planet", "Ring"], true),
            new Element("Uranus", "🪐 Uranus", "space", ["Neptune", "Ring"], true),
            new Element("Neptune", "🪐 Neptune", "space", ["Planet", "Ice"], true),
            new Element("Prickly Pear", "🌵 Prickly Pear", "nature", ["Cactus", "Flower"], true),
            new Element("Grave", "🪦 Grave", "humanInnovation", ["Death", "Stone"], true),
            new Element("Cemetery", "🪦 Cemetery", "humanInnovation", ["Grave", "Grave"], true),
            new Element("Iron", "⛏️ Iron", "nature", ["Metal", "Ore"], true),
            new Element("Carbon", "©️ Carbon", "science", ["Coal", "Air"], true),
            new Element("Natural Gas", "🔥 Natural Gas", "nature", ["Earth", "Carbon"], true),
            new Element("Gasoline", "⛽ Gasoline", "humanInnovation", ["Natural Gas", "Car"], true),
            new Element("Gas Station", "⛽ Gas Station", "humanInnovation", ["Gasoline", "City"], true),
            new Element("Steel", "🔨 Steel", "humanInnovation", ["Iron", "Carbon"], true),
            new Element("Aquamarine", "💎 Aquamarine", "nature", ["Gem", "Water"], true),
            new Element("Pyrite", "🪨 Pyrite", "nature", ["Gem", "Iron"], true),
            new Element("Gold", "🪙 Gold", "nature", ["Pyrite", "Metal"], true),
            new Element("Money", "💵 Money", "humanInnovation", ["Human", "Gold"], true),
            new Element("King Midas", "🤴 King Midas", "mythology", ["King", "Gold"], true),
            new Element("Food", "😋 Food", "foodDrink", ["Chef", "Money"], true),
            new Element("Anger", "😡 Anger", "feelingsTraits", ["Heartbreak", "Pride"], true),
            new Element("Sadness", "😢 Sadness", "feelingsTraits", ["Anger", "Water"], true),
            new Element("Happiness", "😀 Happiness", "feelingsTraits", ["Sadness", "Love"], true),
            new Element("Fun", "😀 Fun", "feelingsTraits", ["Happiness", "Entertainment"], true),
            new Element("Melancholy", "😐 Melancholy", "feelingsTraits", ["Sadness", "Happiness"], true),
            new Element("Stress", "😰 Stress", "feelingsTraits", ["Human", "Pressure"], true),
            new Element("Anxiety", "😰 Anxiety", "feelingsTraits", ["Stress", "Human"], true),
            new Element("Fear", "😱 Fear", "feelingsTraits", ["Anxiety", "Human"], true),
            new Element("Pride", "❤️ Pride", "feelingsTraits", ["Sin", "Lucifer"], true),
            new Element("Wrath", "🧡 Wrath", "feelingsTraits", ["Anger", "Pride"], true),
            new Element("Gluttony", "💛 Gluttony", "feelingsTraits", ["Food", "Greed"], true),
            new Element("Greed", "💚 Greed", "feelingsTraits", ["Money", "Human"], true),
            new Element("Lust", "💙 Lust", "feelingsTraits", ["Love", "Sin"], true),
            new Element("Envy", "💜 Envy", "feelingsTraits", ["Greed", "Pride"], true),
            new Element("Sloth", "🩷 Sloth", "feelingsTraits", ["Human", "Gluttony"], true),
            new Element("Satan", "👹 Satan", "mythology", ["Wrath", "Demon"], true),
            new Element("Beelzebub", "👹 Beelzebub", "mythology", ["Gluttony", "Demon"], true),
            new Element("Mammon", "👹 Mammon", "mythology", ["Greed", "Demon"], true),
            new Element("Asmodeus", "👹 Asmodeus", "mythology", ["Lust", "Demon"], true),
            new Element("Leviathan", "👹 Leviathan", "mythology", ["Envy", "Demon"], true),
            new Element("Belphegor", "👹 Belphegor", "mythology", ["Sloth", "Demon"], true),
            new Element("Limbo", "⚫ Limbo", "mythology", ["Hell", "Heaven"], true),
            new Element("Purgatory", "☠️ Purgatory", "mythology", ["Limbo", "Death"], true),
            new Element("Jesus", "✝️ Jesus", "notableFigures", ["Human", "God"], true),
            new Element("Christian", "✝️ Christian", "humanInnovation", ["Human", "Jesus"], true),
            new Element("Crucifixion", "✝️ Crucifixion", "humanInnovation", ["Jesus", "Death"], true),
            new Element("Church", "⛪ Church", "humanInnovation", ["Jesus", "House"], true),
            new Element("Pastor", "✝️ Pastor", "occupations", ["Church", "Human"], true),
            new Element("Bible", "✝️ Bible", "mythology", ["Book", "Jesus"], true),
            new Element("Oven", "🔥 Oven", "humanInnovation", ["Food", "Heat"], true),
            new Element("Microwave Oven", "🔥 Microwave Oven", "humanInnovation", ["Oven", "Radiation"], true),
            new Element("Magnet", "🧲 Magnet", "science", ["Metal", "Electricity"], true),
            new Element("Sound", "🔊 Sound", "science", ["Air", "Wave"], true),
            new Element("Radio", "🟦 Radio", "science", ["Sound", "Radiation"], true),
            new Element("Microwave", "🟧 Microwave", "science", ["Microwave Oven", "Radiation"], true),
            new Element("Infrared", "🟥 Infrared", "science", ["Heat", "Radiation"], true),
            new Element("Ultraviolet", "🟪 Ultraviolet", "science", ["Light", "Radiation"], true),
            new Element("X-Ray", "⬜ X-Ray", "science", ["Doctor", "Radiation"], true),
            new Element("Gamma", "🟩 Gamma", "science", ["Radiation", "Nuclear Blast"], true),
            new Element("Bomb", "💣 Bomb", "humanInnovation", ["Gunpowder", "Gunpowder"], true),
            new Element("Explosion", "💥 Explosion", "science", ["Bomb", "Fire"], true),
            new Element("Atomic Bomb", "☢️ Atomic Bomb", "humanInnovation", ["Bomb", "Uranium"], true),
            new Element("Nuclear Blast", "💥 Nuclear Blast", "science", ["Atomic Bomb", "Explosion"], true),
            new Element("Apocalypse", "💥 Apocalypse", "science", ["Atomic Bomb", "Earth"], true),
            new Element("Fighter Jet", "✈️ Fighter Jet", "humanInnovation", ["Airplane", "Gun"], true),
            new Element("Bomber Plane", "✈️ Bomber Plane", "humanInnovation", ["Airplane", "Bomb"], true),
            new Element("Intercontinental Ballistic Missile", "🚀 Intercontinental Ballistic Missile", "humanInnovation", ["Rocket", "Atomic Bomb"], true),
            new Element("Harbor", "⚓ Harbor", "humanInnovation", ["Ship", "City"], true),
            new Element("Boston Tea Party", "🍵 Boston Tea Party", "notableFigures", ["Harbor", "Tea"], true),
            new Element("Attack on Pearl Harbor", "✈️ Attack on Pearl Harbor", "notableFigures", ["Harbor", "Bomber Plane"], true),
            new Element("Clam", "🐚 Clam", "animals", ["Fish", "Gem"], true),
            new Element("Pearl", "🐚 Pearl", "nature", ["Clam", "Gem"], true),
            new Element("Cherub", "👼 Cherub", "mythology", ["Angel", "Baby"], true),
            new Element("Cupid", "💘 Cupid", "mythology", ["Cherub", "Love"], true),
            new Element("Leprechaun", "🍀 Leprechaun", "mythology", ["Gold", "Rainbow"], true),
            new Element("Knowledge", "🧠 Knowledge", "science", ['Book', 'Idea'], true),
            new Element("Brain", "🧠 Brain", "nature", ["Knowledge", "Human"], true),
            new Element("Science", "⚛️ Science", "science", ["Knowledge", "Universe"], true),
            new Element("Scientist", "👩‍🔬 Scientist", "occupations", ["Science", "Human"], true),
            new Element("Sickness", "🤒 Sickness", "science", ["Bacteria", "Human"], true),
            new Element("Doctor", "👩‍⚕️ Doctor", "occupations", ["Scientist", "Sickness"], true),
            new Element("Medicine", "💊 Medicine", "science", ["Sickness", "Doctor"], true),
            new Element("Poison", "☠️ Poison", "science", ["Medicine", "Death"], true),
            new Element("Vaccine", "💉 Vaccine", "science", ["Medicine", "Bacteria"], true),
            new Element("Biology", "🦠 Biology", "science", ["Life", "Science"], true),
            new Element("Chemistry", "⚗️ Chemistry", "science", ["Energy", "Science"], true),
            new Element("Physics", "🔬 Physics", "science", ["Gravity", "Science"], true),
            new Element("Astronomy", "🔭 Astronomy", "science", ["Space", "Science"], true),
            new Element("Geology", "🪨 Geology", "science", ["Earth", "Science"], true),
            new Element("Psychology", "🧠 Psychology", "science", ["Brain", "Science"], true),
            new Element("Philosophy", "📜 Philosophy", "science", ["Idea", "Science"], true),
            new Element("Meteorology", "🌪️ Meteorology", "science", ["Weather", "Science"], true),
            new Element("Baby Oil", "🧴 Baby Oil", "nature", ["Baby", "Oil"], true),
            new Element("P. Diddy", "🧴 P. Diddy", "notableFigures", ["Baby Oil", "Human"], true),
            new Element("School", "🏫 School", "humanInnovation", ["Knowledge", "House"], true),
            new Element("University", "🎓 University", "humanInnovation", ["School", "Knowledge"], true),
            new Element("Teacher", "👩‍🏫 Teacher", "occupations", ["School", "Human"], true),
            new Element("Professor", "👨‍🏫 Professor", "occupations", ["University", "Human"], true),
            new Element("Notebook", "📓 Notebook", "humanInnovation", ["Book", "School"], true),
            new Element("Pen", "🖊️ Pen", "humanInnovation", ["Notebook", "Tool"], true),
            new Element("Ink", "🖊️ Ink", "nature", ["Pen", "Water"], true),
            new Element("Pencil", "✏️ Pencil", "humanInnovation", ["Rock", "Pen"], true),
            new Element("Graphite", "✏️ Graphite", "nature", ["Pencil", "Stone"], true),
            new Element("Death Note", "📓 Death Note", "media", ["Notebook", "Death"], true),
            new Element("Shinigami", "👹 Shinigami", "mythology", ["Death Note", "God"], true),
            new Element("Ryuk", "👹 Ryuk", "media", ["Shinigami", "Apple"], true),
            new Element("Light Yagami", "🧠 Light Yagami", "media", ["Death Note", "Light"], true),
            new Element("Radio", "📻 Radio", "media", ["Sound", "Tool"], true),
            new Element("Television", "📺 Television", "media", ["Radio", "Light"], true),
            new Element("Movie", "📺 Movie", "media", ["Television", "Media"], true),
            new Element("TV Show", "📺 TV Show", "media", ["Movie", "Entertainment"], true),
            new Element("Story", "📖 Story", "media", ["Book", "Entertainment"], true),
            new Element("Computer", "💻 Computer", "humanInnovation", ["Electricity", "Knowledge"], true),
            new Element("Music", "🎵 Music", "media", ["Sound", "Entertainment"], true),
            new Element("Phone", "📱 Phone", "humanInnovation", ["Sound", "Electricity"], true),
            new Element("Remote Control", "📱 Remote Control", "humanInnovation", ["Television", "Tool"], true),
            new Element("Entertainment", "🎬 Entertainment", "feelingsTraits", ["Television", "Human"], true),
            new Element("Video Game", "🎮 Video Game", "media", ["Entertainment", "Remote Control"], true),
            new Element("Graphic Novel", "📚 Graphic Novel", "media", ["Ink", "Book"], true),
            new Element("Toy", "🧸 Toy", "humanInnovation", ["Baby", "Entertainment"], true),
            new Element("Doll", "🪆 Doll", "humanInnovation", ["Toy", "Girl"], true),
            new Element("Action Figure", "🪆 Action Figure", "humanInnovation", ["Doll", "Boy"], true),
            new Element("Voodoo Doll", "🪆 Voodoo Doll", "mythology", ["Doll", "Magic"], true),
            new Element("Media", "📺 Media", "media", ["Knowledge", "Entertainment"], true),
            new Element("Horror Game", "👹 Horror", "media", ["Entertainment", "Fear"], true),
            new Element("Comedy", "😂 Comedy", "media", ["Entertainment", "Happiness"], true),
            new Element("Action", "💥 Action", "media", ["Entertainment", "Explosion"], true),
            new Element("Romance", "❤️ Romance", "media", ["Entertainment", "Love"], true),
            new Element("Horror Game", "👹 Horror Game", "media", ["Video Game", "Horror"], true),
            new Element("Five Nights at Freddy's", "🐻 Five Nights at Freddy's", "media", ["Horror Game", "Bear"], true),
            new Element("Freddy Fazbear", "🐻 Freddy Fazbear", "media", ["Five Nights at Freddy's", "Bear"], true),
            new Element("Bonnie", "🐰 Bonnie", "media", ["Five Nights at Freddy's", "Rabbit"], true),
            new Element("Chica", "🐔 Chica", "media", ["Five Nights at Freddy's", "Chicken"], true),
            new Element("Poppy Playtime", "🧸 Poppy Playtime", "media", ["Horror Game", "Toy"], true),
            new Element("Poppy", "🧸 Poppy", "media", ["Poppy Playtime", "Doll"], true),
            new Element("Harley Sawyer", "🧠 Harley Sawyer", "media", ["Poppy Playtime", "Doctor"], true),
            new Element("The Prototype", "👹 The Prototype", "media", ["Poppy Playtime", "Robot"], true),
            new Element("Mommy Long Legs", "🧸 Mommy Long Legs", "media", ["Poppy Playtime", "Spider"], true),
            new Element("Bendy and the Ink Machine", "😈 Bendy and the Ink Machine", "media", ["Horror Game", "Ink"], true),
            new Element("9/11", "✈️ 9/11", "notableFigures", ["Airplane", "Skyscraper"], true),
            new Element("Andrew Carnegie", "🔨 Andrew Carnegie", "notableFigures", ["Steel", "Idea"], true),
            new Element("Eye", "👁️ Eye", "nature", ["Light", "Life"], true),
            new Element("Glasses", "👓 Glasses", "humanInnovation", ["Eye", "Glass"], true),
            new Element("Dr. House", "🧑‍⚕️ Dr. House", "media", ["Doctor", "House"], true),
            new Element("Coral", "🪸 Coral", "nature", ["Ocean", "Plant"], true),
            new Element("Ratatouille", "🐭 Ratatouille", "media", ["Chef", "Rat"], true),
            new Element("Remy", "🐭 Remy", "media", ["Ratatouille", "Rat"], true),
            new Element("Linguini", "🧑‍🍳 Linguini", "media", ["Ratatouille", "Chef"], true),
            new Element("Prism", "💡 Prism", "science", ["Light", "Glass"], true),
            new Element("Color", "🎨 Color", "science", ["Light", "Prism"], true),
            new Element("Red", "❤️ Red", "science", ["Color", "Apple"], true),
            new Element("Pink", "🩷 Pink", "science", ["Red", "White"], true),
            new Element("Orange", "🧡 Orange", "science", ["Red", "Yellow"], true),
            new Element("Yellow", "💛 Yellow", "science", ["Color", "Sun"], true),
            new Element("Green", "💚 Green", "science", ["Yellow", "Blue"], true),
            new Element("Teal", "🟢 Teal", "science", ["Green", "Blue"], true),
            new Element("Blue", "💙 Blue", "science", ["Color", "Ocean"], true),
            new Element("Cyan", "🩵 Cyan", "science", ["Blue", "White"], true),
            new Element("Indigo", "🟣 Indigo", "science", ["Blue", "Purple"], true),
            new Element("Violet", "💜 Purple", "science", ["Red", "Blue"], true),
            new Element("Brown", "🤎 Brown", "science", ["Red", "Green"], true),
            new Element("Black", "🖤 Black", "science", ["Color", "Space"], true),
            new Element("White", "🤍 White", "science", ["Color", "Light"], true),
            new Element("Gray", "🩶 Gray", "science", ["Black", "White"], true),
            new Element("The Truman Show", "📺 The Truman Show", "media", ["Movie", "TV Show"], true),
            new Element("VR", "🕶️ VR", "media", ["Glasses", "Entertainment"], true),
            new Element("Confidence", "😎 Confidence", "feelingsTraits", ["Happiness", "Pride"], true),
            new Element("Graphene", "🪨 Graphene", "science", ["Graphite", "Paper"], true),
            new Element("Steven Universe", "💎 Steven Universe", "media", ["Gem", "Human"], true),
            new Element("Crystal Gems", "💎 Crystal Gems", "media", ["Gem", "Space"], true),
            new Element("Mirror", "🪞 Mirror", "humanInnovation", ["Glass", "Tool"], true),
            new Element("Opposite", "🔄 Opposite", "science", ["Mirror", "Light"], true),
            new Element("Darkness", "🌑 Darkness", "nature", ["Opposite", "Light"], true),
            new Element("Portal", "🌀 Portal", "science", ["Door", "Mirror"], true),
            new Element("Portal 1", "🌀 Portal 1", "media", ["Portal", "Video Game"], true),
            new Element("Portal 2", "🌀 Portal 2", "media", ["Portal 1", "Portal 1"], true),
            new Element("GLaDOS", "🧠 GLaDOS", "media", ["Portal 1", "AI"], true),
            new Element("Wheatley", "🧿 Wheatley", "media", ["Portal 2", "Robot"], true),
            new Element("Space Odyssey", "🚀Space Odyssey", "media", ["AI", "Space"], true),
            new Element("HAL 9000", "🧠 HAL 9000", "media", ["Space Odyssey", "AI"], true),
            new Element("I Have No Mouth, and I Must Scream", "😱 I Have No Mouth, and I Must Scream", "media", ["AI", "Story"], true),
            new Element("AM", "🧠 AM", "media", ["I Have No Mouth, and I Must Scream", "AI"], true),
            new Element("AI", "🤖 AI", "science", ["Electricity", "Knowledge"], true),
            new Element("Robot", "🤖 Robot", "humanInnovation", ["AI", "Metal"], true),
            new Element("Camping", "⛺ Camping", "humanInnovation", ["Forest", "Entertainment"], true),
            new Element("Tent", "⛺ Tent", "humanInnovation", ["Camping", "House"], true),
            new Element("Circus", "🎪 Circus", "humanInnovation", ["Tent", "Entertainment"], true),
            new Element("The Amazing Digital Circus", "🎪 The Amazing Digital Circus", "media", ["Circus", "Computer"], true),
            new Element("Caine", "🔴 Caine", "media", ["The Amazing Digital Circus", "AI"], true),
            new Element("Bubble", "🫧 Bubble", "media", ["The Amazing Digital Circus", "Air Bubble"], true),
        ];

        socket.emit('elementsData', returnDict);
    });

    socket.on('getUserElements', (username) => {
        db.get('SELECT alchemyUnlockedElements FROM users WHERE username = ?', [username], (err, row) => {
            const userElements = JSON.parse(row.alchemyUnlockedElements);
            socket.emit('userElementsData', userElements);
        });
    });

    socket.on('updateUserElements', (data) => {
        const username = data.username;
        const elements = data.elements;
        db.run('UPDATE users SET alchemyUnlockedElements = ? WHERE username = ?', [JSON.stringify(elements), username], (err) => {
                if (err) {
                    console.error('Error updating user elements:', err);
                }
        });
    });

    io.on('disconnect', () => {
        console.log('Disconnected from auth server');
    });

    // START SERVER
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});