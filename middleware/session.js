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