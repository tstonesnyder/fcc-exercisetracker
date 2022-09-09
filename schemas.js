'use strict';

let mongoose = require('mongoose');

console.log('SCHEMAS.JS');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is a required field']
  },
  log: [
    {
      description: {
        type: String,
        required: [true, 'Description is a required field']
      },
      duration: {
        type: Number, 
        required: [true, 'Duration is a required field'],
        min: [0, 'Duration must be greater than zero']
      },
      date: {
        type: Date,
        // Date.now() returns the current unix timestamp as a number
        default: Date.now
      }
    }
  ]
});
// CREATE THE MODEL FROM THE SCHEMA:
// The 1st arg is the singular name of the collection your model is for. 
// Mongoose automatically looks for the plural, lowercased version of your model name.
const User = mongoose.model('User', userSchema);

exports.UserModel = User;
console.log('SCHEMAS.JS LOADED');
