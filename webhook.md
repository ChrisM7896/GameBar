# Webhook for auto-update

Gamebar webhook endpoint example:

```js
const GITHUB_WEBHOOK_ENABLED = process.env.GITHUB_WEBHOOK_ENABLED || false
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'your_webhook_secret';
const WEBHOOK_SCRIPT_PATH = process.env.WEBHOOK_SCRIPT_PATH || './'

let readyForUpdate = false

if (GITHUB_WEBHOOK_ENABLED) {
    app.post('/api/webhook', (req, res) => {
        res.sendStatus(200) // Tell github the request was received

        if (req.body.ref != 'refs/heads/main') return // Only update for main branch
        readyForUpdate = true
    })
}

function pullAndUpdate() {
    if (!GITHUB_WEBHOOK_ENABLED) return

    spawn(WEBHOOK_SCRIPT_PATH, [], {
        detached: true,
        stdio: 'ignore'
    }).unref()
}

io.on('connection', (socket) => {
    socket.on('update', (user) => {
        if (!readyForUpdate || !GITHUB_WEBHOOK_ENABLED || !managers.includes(user)) return
        console.log('RUNNING UPDATE SCRIPT')

        pullAndUpdate()
    })
})
```

The github webhook is configured to send the post request to `https://gamebar.yorktechapps.com/api/webhook`.
When the post request is received, it makes sure that the updated branch is the main branch, then runs this script when the managers are ready:
```sh
git fetch
git pull origin main
npm i
pm2 restart GameBar
```