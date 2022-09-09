'use strict';

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const db = require("./db.js"); // My code

const app = express();
console.log('INDEX.JS');

// Parse application/x-www-form-urlencoded body (url-encoded):
// A new body object containing the parsed data is populated on the request object after the middleware (i.e. req.body). 
// This object will contain key-value pairs, where the value can be a string or array (when extended is false), or any type (when extended is true).
// https://expressjs.com/en/resources/middleware/body-parser.html
// app.use(bodyParser.urlencoded({extended: false}));
// Create application/x-www-form-urlencoded parser, which will only be called by routes that need it:
let urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(cors());
app.use(express.static('public'));

app.use(function(req, res, next) {
  // Log info about this request to console:
  console.log(req.method, req.path, '--', req.ip);
  next();
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/is-mongoose-ok", function (req, res) {
  res.json({ isMongooseOk: !!mongoose.connection.readyState });
});

app.post('/api/users', urlencodedParser, (req, res, next) => {
  // urlencodedParser is run just before this. It makes the body data available on the req obj.
  db.addUser(req.body, function (err, data) {
    if (err) {
      if (err.name === "ValidationError") {
        // Pass the custom error msg to the user:
        res.status(400).json({ error: err.errors.username.message });
      } else {
        // If PRODUCTION, user will get "Internal server error" message.
        // If DEVELOPMENT, user will get full error message.
        return next(err);
      }
    } else {
      res.json(data);
    }
  });
});

app.get('/api/users', urlencodedParser, (req, res, next) => {
  db.getAllUsers(function (err, data) {
    if (err) {
      // If PRODUCTION, user will get "Internal server error" message.
      // If DEVELOPMENT, user will get full error message.
      return next(err);
    } else {
      res.json(data);
    }
  });
});

app.post('/api/users/:_id/exercises', urlencodedParser, (req, res, next) => {
  // Get _id from the params, instead of from the body
  db.addExercise(req.params._id, req.body, function (err, data) {
    if (err) {
      if (err.name === "ValidationError") {
        // Pass the custom error msg to the user:
        res.status(400).json(err);
      } else {
        // If PRODUCTION, user will get "Internal server error" message.
        // If DEVELOPMENT, user will get full error message.
        return next(err);
      }
    } else {
      res.json(data);
    }
  });
});

// PATH:   /api/users/:_id/logs?[from][to][limit]
// from, to, and limit are optional
// http://localhost:3000/api/users/6314b502a574d211edcf772d/logs
app.get('/api/users/:_id/logs', (req, res, next) => {
  db.getLogs(req.params._id, req.query, function (err, data) {
    if (err) {
      // If PRODUCTION, user will get "Internal server error" message.
      // If DEVELOPMENT, user will get full error message.
      return next(err);
    } else {
      res.json(data);
    }
  });
});

// Unmatched routes handler
app.use(function (req, res) {
  res.status(404).type("txt").send("Not Found");
});

// Custom error handler
app.use(function errorHandler (err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  // console.error('ERROR:', Date());
  if (err.code === 400) {
    console.error('USER ERROR: ' + (err.message || 'Bad request'));
    res.status(400).send('ERROR: ' + (err.message || 'Bad request'));
  } else {
    return next(err);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
  console.log('NODE_ENV:', process.env.NODE_ENV);
});
console.log('INDEX.JS LOADED');
