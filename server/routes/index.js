const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const { exec } = require("child_process");

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

router.post("/printLog", function(req, res, next) {
  cmd_number++;

  let today = new Date();
  console.log(today.toLocaleString());

  let cmd = {
    start: today.toLocaleString(),
    finish: "N/A",
    name: req.body.command,
    sha: req.body.sha,
    state: "RUNNING",
    numb: cmd_number
  };

  cmds.push(cmd);
  exec(
    `set -x && mkdir -p build/${cmd.numb} && cd build/${cmd.numb} && git clone https://github.com/nginx/nginx-tests && cd nginx-tests && git checkout ${cmd.sha} && ${cmd.name}`,
    (err, stdout, stderr) => {
      cmd.finish = new Date().toLocaleString();
      cmd.stdout = stdout;

      if (err) {
        cmd.state = "FAILED";
        return;
      }
      cmd.state = "SUCCESS";
    }
  );
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
    status: result.state,
    cmd: result.name,
    stdout: output_lines
  });
});

/* Register agent */
router.post("/notify_agent", function(req, res, _) {
    const {host, port} = req.body;

    // TODO: introduce UUIDs

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

    res.status(200).end();
});


module.exports = router;
