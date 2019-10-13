const express = require('express')
const app = express()
const port = 3000

const http = require('http');

// TODO: move to config
const HARDCODED_MY_PORT = 3001;
const HARDCODED_SERVER_HOST = 'localhost';
const HARDCODED_SERVER_PORT = '3000';

function registerOurselfs() {
    const payload = JSON.stringify({
        host: "localhost",
        port: HARDCODED_MY_PORT,
    });

    const options = {
        hostname: HARDCODED_SERVER_HOST,
        port: HARDCODED_SERVER_PORT,
        path: '/notify_agent',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
        });
        res.on('end', () => {
            console.log('Successfully registered ourselfs in Server.');
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    // Write data to request body
    req.write(payload);
    req.end();
}

registerOurselfs();

app.post('/', (req, res) => res.send('Hello World!'))

app.listen(HARDCODED_MY_PORT, () => console.log(`Agent listening on port ${HARDCODED_MY_PORT}!`))
