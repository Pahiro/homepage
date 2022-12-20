const express = require("express");
const mariadb = require("mariadb");

const app = express();

const pool = mariadb.createPool({
    host: "localhost",
    user: "root",
    password: "toor",
    database: "testdb"});

app.get("/", (req, res) => {

    pool.getConnection().then(conn => {
        conn.query("SELECT * FROM test").then(rows => {
            res.send(rows[0].text);
        });
    }).catch(err => { console.log(err); });
});

app.listen(3000, () => {
    console.log("Listening on port 3000");
});