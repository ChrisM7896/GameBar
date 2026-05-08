cd \..

git fetch --all
git reset --hard origin/main

npm install

pm2 restart my-app