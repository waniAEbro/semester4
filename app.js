const {
    Client,
    LocalAuth
} = require('whatsapp-web.js');

const express = require("express");
const qrcode = require('qrcode');
const qrcodeterminal = require("qrcode-terminal");
const http = require("http");
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


app.post("/send", [body("number").notEmpty(), body("message").notEmpty()], async (req, res) => {
    let number = req.body.number;
    let message = req.body.message;

    number = "62" + number.substr(1);

    number = number + "@c.us";

    const isRegisteredNumber = await checkRegisteredNumber(number);

    if (!isRegisteredNumber) {
        return res.status(422).json({
            status: false,
            message: "nomor bukan pengguna whatsapp"
        });
    }

    const error = validationResult(req).formatWith(({
        msg
    }) => {
        return msg;
    });

    if (!error.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: error.mapped()
        });
    }

    client.sendMessage(number, message).then(response => {
        res.status(200).json({
            status: true,
            message: response
        })
    }).catch(err => {
        res.status(500).json({
            status: false,
            message: err
        })
    });
})


client.initialize();

client.on('message', async msg => {
    if (msg.body === '!ping reply') {
        // Send a new message as a reply to the current one
        msg.reply('pong');
    }
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
    // client.on('ready', () => {
    //     socket.emit("message", "whatsapp siap digunakan");
    // });
});




server.listen(process.env.PORT || 5000, function () {
    console.log("connected");
});