var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var jwt = require('jsonwebtoken');
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
const expressValidator = require('express-validator');

//serve jwt-decode library to the client
app.use('/scripts/jwt-decode', express.static(__dirname + '/node_modules/jwt-decode/build/'));

//enable body parsing
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//set up express validator
app.use(expressValidator());

//port number
const PORT = process.env.PORT || 5000;

//api url
const API_URL = process.env.API_URL || ("http://localhost:" + PORT);

//serve envirnment variables to the client
const fs = require('fs');
fs.writeFileSync(
    __dirname + '/app/config/env.js',
    'var API_URL = "' + API_URL + '";'
);
app.use(express.static(__dirname + '/app/config'));

//serve client files so they are available to the client and handle get requests by serving the index.html file
app.use(express.static(__dirname + '/client'));
const path = require('path');
app.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname + '/client/index.html'));
});

//connect to the database
mongoose.connect(process.env.MONGODB_CONN_STRING);
var db = mongoose.connection;
db.on("error", function () {
    console.log("Database connection error");
});
db.once("open", function () {
    console.log("Database connection open!");
});

//include routes module and set up the router
var routes = require('./app/routes.js')(jwt);
app.use('/api', routes);

//include socketio module which holds all of our application logic
require('./app/socketio')(io, jwt);

//middleware for error handling
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(err.status || 500);
    res.send(err.message);
});

//start server
http.listen(PORT, function () {
    console.log('Server listening on ' + PORT);
});
