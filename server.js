"use strict";

const express = require("express");
const mongo = require("mongodb");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const cors = require("cors");

const app = express();

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

mongoose.set("useFindAndModify", false);

// mongoose.connect(process.env.DB_URI);
mongoose.connect(
  process.env.MONGODB_URL,
  { useNewUrlParser: true, useUnifiedTopology: true },
  function(error) {
    // Do things once connected
    if (error) {
      console.log("Database error or database connection error " + error);
    }
    console.log("Database state is " + mongoose.connection.readyState);
  }
);

const trackerSchema = mongoose.Schema({
  username: String,
  _id: mongoose.ObjectId,
  log: [
    {
      description: String,
      duration: Number,
      date: Date
    }
  ]
});

const trackerModel = mongoose.model("trackerModel", trackerSchema, "tracker");

app.post("/api/exercise/new-user", (req, res) => {
  const username = req.body.username;

  //check if username is already taken
  trackerModel.find({ username }, (err, user) => {
    if (err) {
      console.log(err);
    } else {
      if (user.length === 0) {
        //save new username - BEGIN
        const id = mongoose.Types.ObjectId();
        const newTracker = new trackerModel({ username, _id: id });
        newTracker.save(function(err, doc) {
          if (err) return console.error(err);
          console.log("Username " + username + " inserted successfully!");
        });
        //save new username - END

        res.json({ username, _id: id });
      } else {
        res.send("Username already taken");
      }
    }
  });
});

app.get("/api/exercise/users", (req, res) => {
  trackerModel.find({}, (err, users) => {
    if (err) {
      console.log(err);
    } else {
      if (users.length === 0) {
        res.send("There are no users registered!");
      } else {
        res.json(users);
      }
    }
  });
});

app.post("/api/exercise/add", (req, res) => {
  const id = req.body.userId;
  const description = req.body.description;
  const duration = Number(req.body.duration);
  const date = req.body.date
    ? new Date(req.body.date).toDateString()
    : new Date().toDateString();

  const newLog = {
    description,
    duration,
    date
  };

  trackerModel.findById(id, (err, user) => {
    if (err) {
      console.log(err);
    } else {
      console.log(user);
      if (user === null) {
        res.send("The ID entered is not registered!");
      } else {
        let log = user.log;
        log.push(newLog);

        trackerModel.findByIdAndUpdate(
          id,
          { log, count: user.log.length },
          (err, res) => {
            if (err) console.log(err);
            console.log(res);
          }
        );

        res.json({
          _id: id,
          username: user.username,
          description,
          duration,
          date
        });
      }
    }
  });
});

app.get("/api/exercise/log", (req, res) => {
  const { userId, from, to, limit } = req.query;

  trackerModel.findById(userId, (err, user) => {
    if (err) {
      console.log(err);
    } else {
      if (user === null) {
        res.send("The ID entered is not registered!");
      } else {
        if (from || to) {
          let fromDate = from ? new Date(from) : new Date(0);
          let toDate = to ? new Date(to) : new Date();

          fromDate = fromDate.getTime();
          toDate = toDate.getTime();

          user.log = user.log.filter(exercise => {
            let exerciseDate = new Date(exercise.date).getTime();

            return exerciseDate >= fromDate && exerciseDate <= toDate;
          });
        }

        if (limit) {
          user.log = user.log.slice(0, limit);
        }

        let newUser = user.toJSON();
        newUser["count"] = user.log.length;
        res.json(newUser);
      }
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
