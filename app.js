const {
    Client,
    LocalAuth,
    List,
    Buttons
} = require('whatsapp-web.js');

const express = require("express");
const qrcode = require('qrcode');
const qrcodeterminal = require("qrcode-terminal");
const http = require("http");
const requestify = require("requistify");
const socket = require("socket.io");
const {
    body,
    validationResult
} = require("express-validator");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ]
    }
});

const checkRegisteredNumber = async function (number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
}

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.get("/", (req, res) => {
    res.sendFile("index.html", {
        root: __dirname
    });
});

app.post("/send", (req, res) => {
    let number = req.body.number;
    let message = req.body.message;

    client.sendMessage(number, message);

    res.status(200).json({
        message: true
    });
});


app.post("/sendList", (req, res) => {
    let number = req.body.number;
    let message = req.body.message;
    let title = req.body.title;
    let body = req.body.body;

    let list = new List(body, 'btnText', message, title, 'footer');

    client.sendMessage(number, list);

    res.status(200).json({
        message: true
    });
});

client.initialize();

client.on('message', async msg => {
    requestify.post('https://laravel-pkm.herokuapp.com/api/whatsapp', {
        pesan: msg.body,
        nomor: msg.from
    });
});

// socket

io.on("connection", function (socket) {
    socket.emit("message", "connecting...");

    client.on('qr', (qr) => {
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit("qr", url);
            socket.emit("message", "silakan scan QR Code");
        });
    });

    client.on('authenticated', () => {
        socket.emit("message", "whatsapp siap digunakan");
    });

    // client.on('auth_failure', msg => {
    //     // Fired if session restore was unsuccessful
    //     console.error('AUTHENTICATION FAILURE', msg);
    // });
    client.on('ready', () => {
        socket.emit("message", "whatsapp siap digunakan");
    });
});




server.listen(process.env.PORT || 5000, function () {
    console.log("connected");
});