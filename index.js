const express = require("express");
const app = express();
const fs = require("fs");

const port = 3000;
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "pug");

var ews = require("express-ws")(app);
var ewss = ews.getWss("/ws/appliances");

const rules = [
    [4, 2],
    [4, 3],
    [4, 5],
    [1, 4, 5],
];

function rule_check(appliances) {
    for (let i = 0; i < rules.length; i++) {
        let statuses = [];
        const rule = rules[i];
        for (let j = 0; j < rule.length; j++) {
            const id = rule[j];
            const appliance = appliances.find(
                (appliance) => appliance.id === id
            );
            if (appliance === undefined) {
                continue;
            }

            statuses.push(appliance.status);
        }

        if (statuses.length === rule.length) {
            let all_on = true;
            statuses.forEach((status) => {
                all_on = all_on && status;
            });
            if (all_on) {
                return true;
            }
        }
    }
    return false;
}

function read_db() {
    return JSON.parse(fs.readFileSync("db.json"));
}

function write_db(data) {
    fs.writeFileSync("db.json", JSON.stringify(data));
}

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/api/appliances", (req, res) => {
    const data = read_db();
    res.render("appliances", { appliances: data.appliances });
});

app.post("/api/toggle", (req, res) => {
    let { id, status = false } = req.body;
    if (id === undefined) {
        return res.render("error", { msg: "invalid id" });
    }

    try {
        id = parseInt(id);
    } catch (e) {
        return res.render("error", { msg: "invalid id" });
    }

    var data = read_db();
    const appliance = data.appliances.find((appliance) => appliance.id === id);
    if (appliance === undefined) {
        return res.render("error", { msg: "appliance not found" });
    }

    appliance.status = status;
    let err_alert = "";
    if (rule_check(data.appliances)) {
        err_alert = "alert('nono')";
        console.log("rule triggered");
    } else {
        write_db(data);
    }

    data = read_db();

    res.render("appliances", { appliances: data.appliances, err_alert });
    app.render("appliances", { appliances: data.appliances }, (err, html) => {
        ewss.clients.forEach((client) => {
            client.send(html);
        });
    });
});

app.ws("/ws/appliances", (ws, req) => {});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
