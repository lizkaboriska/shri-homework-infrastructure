const express = require("express");
const http = require("http");
const router = express.Router();
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const config = require("config");

const REPOSITORY_URL = config.get("repository_url");

router.use(
  bodyParser.urlencoded({
    extended: false
  })
);
router.use(bodyParser.json());

/* GET home page. */
router.get("/", function(req, res, next) {
  res.render("index", { title: "CI", commands: cmds });
});

let cmd_number = 0;
let cmds = [];
let agents = [];

function sendRequestToAgent(agent_id, path, json, message_after_sent) {
    const payload = JSON.stringify(json);

    const options = {
        hostname: agents[agent_id].host,
        port: agents[agent_id].port,
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
        res.on('data', (chunk) => {});
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

let last_used_agent = -1;

function chooseBestAvailableAgent() {
    last_used_agent++;
    if (last_used_agent >= agents.length) {
        last_used_agent = 0;
    }
    return last_used_agent;
}

router.post("/printLog", function(req, res, next) {
  cmd_number++;

  let today = new Date();
  console.log(today.toLocaleString());

  let cmd = {
    start: today.toLocaleString(),
    finish: "N/A",
    name: req.body.command,
    sha: req.body.sha,
    status: "RUNNING",
    numb: cmd_number
  };

  cmds.push(cmd);
  
  const agent_id = chooseBestAvailableAgent();

  sendRequestToAgent(agent_id, "/build", {
    build_number: cmd.numb,
    sha: cmd.sha,
    name: cmd.name,
    repository_url: REPOSITORY_URL
  }, "Build %d was sent to agent successfully.");

  res.json({});
});

function getCommand(number) {
  return cmds.filter(cmd => {
    return cmd.numb === number;
  })[0];
}

router.get("/build/:number", function(req, res, next) {
  let result = getCommand(parseInt(req.params.number));
  console.log(result.name);
  let output_lines = result.stdout.split("\n");
  res.render("build", {
    number: result.numb,
    sha: result.sha,
    start: result.start,
    finish: result.finish,
    status: result.status,
    cmd: result.name,
    stdout: output_lines
  });
});

/* Register agent */
router.post("/notify_agent", function(req, res, _) {
    const {host, port} = req.body;

    if (host == null || port == null) {
        console.log("Bad request: %s", JSON.stringify(req.body));
        res.status(400).end();
        return;
    }

    agents.push({
        host: host,
        port: port,
        num_running: 0,
    });

    res.status(200).end();
});

/* Get build result */
router.post("/notify_build_result", function(req, res, _) {
    const {build_number, status, stdout, stderr} = req.body;

    if (typeof build_number !== 'number' || status == null || stdout == null || stderr == null) {
        console.log("Bad request: %s", JSON.stringify(req.body));
        res.status(400).end();
        return;
    }

    let cmd = getCommand(build_number);

    cmd.status = status;
    cmd.stdout = stdout;
    cmd.stderr = stderr;
    cmd.finish = new Date().toLocaleString();

    res.status(200).end();
});


module.exports = router;
