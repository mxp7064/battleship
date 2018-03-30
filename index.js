var express = require('express');
var app = express();
var router = express.Router();

var http = require('http').Server(app);
var io = require('socket.io')(http);

var jwt = require('jsonwebtoken');

app.use('/scripts/jwt-decode', express.static(__dirname + '/node_modules/jwt-decode/build/'));

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const expressValidator = require('express-validator');
app.use(expressValidator());

const PORT = process.env.PORT || 3000;

//serve envirnment variables to the client
const fs = require('fs');
console.log(__dirname);
fs.writeFileSync(
    __dirname + '/app/config/env.js',
    'var API_URL = ' + process.env.API_URL || "http://localhost:" + PORT + ';'
);
app.use(express.static(__dirname + '/config'));

//serve client files so they are available to the client and handle get requests by serving the index.html file
app.use(express.static(__dirname + '/client'));
const path = require('path');
app.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname + '/client/index.html'));
});

var routes = require('./app/routes.js')(jwt, router);
app.use('/api', routes);

require('./app/socketio')(io, jwt);

app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(err.status || 500);
    res.send(err.message);
}); 



http.listen(PORT, function () {
    console.log('listening on');
});
