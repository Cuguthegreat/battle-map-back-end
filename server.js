var express = require("express");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;
const cors = require('cors');

var ENTITIES = "entities";

var app = express();
app.use(bodyParser.json());
var db;
var collection;

var uri = "mongodb+srv://dbUser:dbUserPassword@cluster0-udc2e.mongodb.net/test";

const server = require('http').createServer();

const io = require('socket.io')(server, {
  path: '/test',
  serveClient: false,
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false
});

server.listen(3000);

mongodb.MongoClient.connect(uri || "mongodb://localhost:27017/test", function (err, client) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  db = client.db();
  collection = db.stock;
  console.log("Database connection ready");

  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });

  const changeStream = collection.watch();

  io.on('connection', function (socket) {
    console.log('Connection!');

    changeStream.on('change', function(change) {
      console.log('COLLECTION CHANGED');

      collection.find({}, (err, data) => {
        if (err) throw err;

        if (data) {
          socket.emit('update', data);
        }
      });
    });
  });
});



function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

app.use(cors());

app.get("/api/entities", function(req, res) {
  db.collection(ENTITIES).find({}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get entities.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.post("/api/entities", function(req, res) {
  var newEntity = req.body;
  newEntity.createDate = new Date();

  if (!req.body.name) {
    handleError(res, "Invalid request", "Must provide a name.", 400);
  } else {
    db.collection(ENTITIES).insertOne(newEntity, function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to create new entity.");
      } else {
        res.status(201).json(doc.ops[0]);
      }
    });
  }
});

app.get("/api/entities/:id", function(req, res) {
  db.collection(ENTITIES).findOne({ _id: new ObjectID(req.params.id) }, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to get entity");
    } else {
      res.status(200).json(doc);
    }
  });
});

app.put("/api/entities/:id", function(req, res) {
  var updateDoc = req.body;
  delete updateDoc._id;

  db.collection(ENTITIES).updateOne({_id: new ObjectID(req.params.id)}, updateDoc, function(err) {
    if (err) {
      handleError(res, err.message, "Failed to update entity");
    } else {
      updateDoc._id = req.params.id;
      res.status(200).json(updateDoc);
    }
  });
});

app.delete("/api/entities/:id", function(req, res) {
  db.collection(ENTITIES).deleteOne({_id: new ObjectID(req.params.id)}, function(err) {
    if (err) {
      handleError(res, err.message, "Failed to delete entity");
    } else {
      res.status(200).json(req.params.id);
    }
  });
});
