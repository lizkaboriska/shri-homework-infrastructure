const express = require('express')
const app = express()
const config = require('config');

const http = require('http');
const { exec } = require("child_process");
const bodyParser = require("body-parser");

app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(bodyParser.json());

const MY_PORT = config.get("port") || 3002;
const SERVER_HOST = config.get("server_host") || 'localhost';
const SERVER_PORT = config.get("server_port") || '3000';

function sendRequestToServer(path, json, message_after_sent) {
    const payload = JSON.stringify(json);

    const options = {
        hostname: SERVER_HOST,
        port: SERVER_PORT,
        path: path,
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
            console.log(message_after_sent);
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    // Write data to request body
    req.write(payload);
    req.end();
}

function registerOurselfs() {
    sendRequestToServer("/notify_agent", {
        host: "localhost",
        port: MY_PORT,
    }, 'Successfully registered ourselfs in Server.');
}

registerOurselfs();

app.post('/build', (req, res) => {
    console.log("request body is: %s", JSON.stringify(req.body));

    const {build_number, repository_url, sha, name} = req.body;

    exec(`mkdir build; rm -rf build/${build_number}; mkdir build/${build_number}; cd build/${build_number} && git clone ${repository_url} && cd nginx-tests && git checkout ${sha} && ${name}`,
        (err, stdout, stderr) => {
            const build_result = {
                build_number: build_number,
                status: err == null ? "SUCCESS" : "FAILED",
                stderr: stderr,
                stdout: stdout,
            };
            sendRequestToServer("/notify_build_result", build_result, "Server was notified of build result.");
        }
    );

    res.send('Hello World!')
})

app.listen(MY_PORT, () =>
    console.log(`Agent listening on port ${MY_PORT}!`)
)
