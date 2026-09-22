git restore ./update.sh
git fetch
git pull origin main
chmod +x ./update.sh
npm i
pm2 restart GameBar