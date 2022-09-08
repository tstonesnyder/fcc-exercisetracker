'use strict';

require('dotenv').config();
let mongoose = require('mongoose');
console.log('DB.JS');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => {
  console.log('Database connection successful');
})
.catch(err => {
  console.error('ERROR: Could not connect to MongoDB at Atlas! You may need to logon to Atlas and RESUME the database.', err);
  // process.exit(1);
});

const User = require("./schemas.js").UserModel;

function MyError(message, code) {
  // Create an Error object that can contain an error code
  // so we can check it in the custom error handler.
  const error = new Error(message);
  error.code = code;
  return error;
}

const addUser = (reqBody, done) => {
  const userDoc = new User({ username: reqBody.username });
  console.log('About to add user ', userDoc);

  // let valError = userDoc.validateSync();
  // console.log('valError.errors.username.message', valError.errors.username.message);

  userDoc.save((err, data) => {
    if (err) {
      if (err.name === "ValidationError") {
        console.error('Validation error:', err.errors.username.message);
      } else {
        // Log full error msg:
        console.error('Error adding user.\n', err);
      }
      return done(err);
    };
    console.log('Added user:', data);
    const returnData = { _id: data._id, username: data.username };
    done(null, returnData);
  });
};

const addExercise = (reqBody, done) => {
  console.log('About to add exercise to user. reqBody:\n', reqBody);

  const query = { _id: reqBody[':_id'] };
  const update = {
    $push: { log: {
      description: reqBody.description,
      duration: reqBody.duration,
      date: reqBody.date
    }}
  };
  const options = { new: true }; // return updated doc inst of original
  User.findOneAndUpdate(query, update, options, (err, data) => {
    if (err) {
      if (err.name === "ValidationError") {
        console.error('Validation error:', err.errors.username.message);
      } else {
        // Log full error msg:
        console.error('Error adding exercise to user.\n', err);
      }
      return done(err);
    };
    console.log('Updated user doc:\n', JSON.stringify(data));
    // ASSUME the last exercise in the log array was the one we added:
    const exercise = data.log[data.log.length - 1];
    // console.log('last exercise doc:', exercise);
    let returnData = {
      _id: data._id,
      username: data.username,
      // data contains the WHOLE document, so the log array may contain lots of exercise docs. So easier to use the info from the body.
      // date: reqBody.date,
      // duration: reqBody.duration,
      // description: reqBody.description
      date: exercise.date,
      duration: exercise.duration,
      description: exercise.description
    };
    done(null, returnData);
  });
};

const getLogs = (_id, reqQuery, done) => {
  // Mongoose does not cast aggregation pipelines to the model's schema
  const pipeline = [
    { '$match': { '_id': mongoose.Types.ObjectId(_id) }},
    // Unwind the log array field, so 1 record per log entry:
    { '$unwind': {
        'path': '$log', 
        'preserveNullAndEmptyArrays': false
    }},
    // [NOT PART OF THE SPEC, BUT SEEMED IMPORTANT]
    // Sort exercises by ascending date:
    // NOTE: Can't use $sortArray cuz it was added in v5.2 and Atlas cloud db is at v5.0.12.
    { '$sort': { 'log.date': 1 } }
  ];
  if (reqQuery.from || reqQuery.to) {
    // Match on exercise date:
    pipeline.push({ '$match': { 'log.date': {}}});
    if (reqQuery.from) {
      const fromDate = new Date(reqQuery.from);
      // Check if invalid date (400, bad request)
      if (isNaN(fromDate)) return done(new MyError('Invalid "from" date', 400));
      pipeline[3]['$match']['log.date']['$gte'] = fromDate;
    }
    if (reqQuery.to) {
      const toDate = new Date(reqQuery.to);
      // Check if invalid date (400, bad request)
      if (isNaN(toDate)) return done(new MyError('Invalid "to" date', 400));
      pipeline[3]['$match']['log.date']['$lte'] = toDate;
    }
  }
  if (reqQuery.limit) {
    const limit = parseInt(reqQuery.limit);
    // Check if invalid nbr (400, bad request)
    if (isNaN(limit)) return done(new MyError('Invalid "limit"', 400));
    pipeline.push({ '$limit': limit });
  }

  // Regroup by user:
  pipeline.push({ '$group': {
    _id: '$_id',
    username: { "$first": "$username" },
    // Recreate 'log' array, but w/o _id field inside it (CHANGED TO USE PROJECT BELOW INSTEAD):
    // log: { "$push": {
    //   date: '$log.date', 
    //   duration: '$log.duration', 
    //   description: '$log.description'
    // }}
    log: { "$push": '$log' }
  }});

  // Remove the log._id field and add the count field:
  pipeline.push({ '$project': {
    'username': 1,
    'count': { '$size': '$log' },  // Nbr items in 'log' array
    'log.date': 1,
    'log.duration': 1,
    'log.description': 1,
  }});

  // console.log('About to get user logs with query:\n', pipeline);
  User.aggregate(pipeline, (err, data) => {
    if (err) {
      console.error('Error querying.\n', err);
      return done(err);
    };
    // console.log('Query successful:', data);
    // This returns an array of 1 object. Instead just return the object:
    done(null, data[0]);
  });
};

exports.addUser = addUser;
exports.addExercise = addExercise;
exports.getLogs = getLogs;
console.log('DB.JS LOADED');