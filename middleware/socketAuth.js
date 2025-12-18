// SOCKET.IO CLIENT TO AUTH SERVER
const socket = io(AUTH_URL, {
    extraHeaders: {
        api: API_KEY
    }
});