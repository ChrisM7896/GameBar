CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    gp INTEGER DEFAULT 0,
    alchemyUnlockedElements TEXT DEFAULT '["Fire", "Water", "Air", "Earth"]'
);
CREATE TABLE IF NOT EXISTS onetime (
    user_id INTEGER NOT NULL,
    alchemy INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);