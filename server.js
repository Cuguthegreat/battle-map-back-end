var express = require("express");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;
const cors = require('cors');

var ENTITIES = 'entities';
var SQUARES = 'squares';

var app = express();
app.use(bodyParser.json());
app.use(cors());
var db;
var collection;

var uri = "mongodb+srv://dbUser:dbUserPassword@cluster0-udc2e.mongodb.net/test";

mongodb.MongoClient.connect(uri || "mongodb://localhost:27017/test", function (err, client) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  db = client.db();
  console.log("Database connection ready");

  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });

  const io = require('socket.io').listen(server);

  const entitiesChangeStream = client.db('test').collection('entities').watch();
  const squaresChangeStream = client.db('test').collection('squares').watch();

  io.on('connection', function (socket) {
    console.log('Connection!');

    entitiesChangeStream.on('change', function(change) {
      console.log('Entities changed', change);

      socket.emit('update', change);
    });

    squaresChangeStream.on('change', function(change) {
      console.log('Squares changed', change);

      socket.emit('update', change);
    });
  });
});

function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

app.get("/api/entities", function(req, res) {
  db.collection(ENTITIES).find({}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to fetch entities.");
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

app.get("/api/squares", function(req, res) {
  db.collection(SQUARES).find({}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to fetch squares.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.post("/api/squares", function(req, res) {
  var newSquare = req.body;
  newSquare.createDate = new Date();

  if (!req.body) {
    handleError(res, "Invalid request", "Must provide data.", 400);
  } else {
    db.collection(SQUARES).insertOne(newSquare, function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to create new square.");
      } else {
        res.status(201).json(doc.ops[0]);
      }
    });
  }
});

app.put("/api/squares/:id", function(req, res) {
  var updateDoc = req.body;
  delete updateDoc._id;

  db.collection(SQUARES).updateOne({_id: new ObjectID(req.params.id)}, updateDoc, function(err) {
    if (err) {
      handleError(res, err.message, "Failed to update entity");
    } else {
      updateDoc._id = req.params.id;
      res.status(200).json(updateDoc);
    }
  });
});