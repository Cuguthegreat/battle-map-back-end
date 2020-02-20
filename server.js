const express = require("express");
const bodyParser = require("body-parser");
const mongodb = require("mongodb");
const ObjectID = mongodb.ObjectID;
const cors = require('cors');

const url = require('url');

const ENTITIES = 'entities';
const SQUARES = 'squares';

const app = express();
app.use(bodyParser.json());
app.use(cors());

const uriTest = "mongodb+srv://dbUser:dbUserPassword@cluster0-udc2e.mongodb.net/test";
const uriDev = "mongodb+srv://dbUser:dbUserPassword@cluster0-udc2e.mongodb.net/dev";

const server = app.listen(process.env.PORT || 8080, function () {
    const port = server.address().port;
    console.log("App now running on port", port);
});

const setupSocketIO = ({io, entitiesChangeStream, squaresChangeStream}) => io.on('connection', socket => {
    console.log('Connection!');

    entitiesChangeStream.on('change', change => {
        console.log('Entities changed', change);

        socket.emit('update', change);
    });

    squaresChangeStream.on('change', change => {
        console.log('Squares changed', change);

        socket.emit('update', change);
    });
});

const connectWithDatabase = uri => {
    let database;

    mongodb.MongoClient.connect(uri, (err, client) => {
        if (err) {
            console.log(err);
            process.exit(1);
        }

        const env = uri.split('/').pop();

        database = client.db();
        console.log(database)
        console.log(`Database connection on ${env} ready`);

        setupSocketIO({
            io: require('socket.io').listen(server),
            entitiesChangeStream: client.db(env).collection('entities').watch(),
            squaresChangeStream: client.db(env).collection('squares').watch()
        });
    });
console.log(database)
    return database;
};

const dbDev = connectWithDatabase(uriDev);
const dbTest = connectWithDatabase(uriTest);

const handleError = (res, reason, message, code) => {
    console.log("ERROR: " + reason);
    res.status(code || 500).json({"error": message});
};

app.get("/api/entities", (req, res) => {
    const queryObject = url.parse(req.url, true).query;

    const db = queryObject.experimental ? dbDev : dbTest;

    db.collection(ENTITIES).find({}).toArray((err, docs) => {
        if (err) {
            handleError(res, err.message, "Failed to fetch entities.");
        } else {
            res.status(200).json(docs);
        }
    });
});

app.post("/api/entities", (req, res) => {
    const newEntity = req.body;
    newEntity.createDate = new Date();

    if (!req.body.name) {
        handleError(res, "Invalid request", "Must provide a name.", 400);
    } else {
        dbTest.collection(ENTITIES).insertOne(newEntity, (err, doc) => {
            if (err) {
                handleError(res, err.message, "Failed to create new entity.");
            } else {
                res.status(201).json(doc.ops[0]);
            }
        });
    }
});

app.get("/api/entities/:id", (req, res) => {
    dbTest.collection(ENTITIES).findOne({_id: new ObjectID(req.params.id)}, (err, doc) => {
        if (err) {
            handleError(res, err.message, "Failed to get entity");
        } else {
            res.status(200).json(doc);
        }
    });
});

app.put("/api/entities/:id", (req, res) => {
    const updateDoc = req.body;
    delete updateDoc._id;

    dbTest.collection(ENTITIES).updateOne({_id: new ObjectID(req.params.id)}, updateDoc, function (err) {
        if (err) {
            handleError(res, err.message, "Failed to update entity");
        } else {
            updateDoc._id = req.params.id;
            res.status(200).json(updateDoc);
        }
    });
});

app.delete("/api/entities/:id", (req, res) => {
    dbTest.collection(ENTITIES).deleteOne({_id: new ObjectID(req.params.id)}, function (err) {
        if (err) {
            handleError(res, err.message, "Failed to delete entity");
        } else {
            res.status(200).json(req.params.id);
        }
    });
});

app.get("/api/squares", function (req, res) {
    dbTest.collection(SQUARES).find({}).toArray((err, docs) => {
        if (err) {
            handleError(res, err.message, "Failed to fetch squares.");
        } else {
            res.status(200).json(docs);
        }
    });
});

app.post("/api/squares", (req, res) => {
    const newSquare = req.body;
    newSquare.createDate = new Date();

    if (!req.body) {
        handleError(res, "Invalid request", "Must provide data.", 400);
    } else {
        dbTest.collection(SQUARES).insertOne(newSquare, (err, doc) => {
            if (err) {
                handleError(res, err.message, "Failed to create new square.");
            } else {
                res.status(201).json(doc.ops[0]);
            }
        });
    }
});

app.put("/api/squares/:id", (req, res) => {
    const updateDoc = req.body;
    delete updateDoc._id;

    dbTest.collection(SQUARES).updateOne({_id: new ObjectID(req.params.id)}, updateDoc, err => {
        if (err) {
            handleError(res, err.message, "Failed to update entity");
        } else {
            updateDoc._id = req.params.id;
            res.status(200).json(updateDoc);
        }
    });
});

app.delete("/api/squares/:id", (req, res) => {
    dbTest.collection(SQUARES).deleteOne({_id: new ObjectID(req.params.id)}, function(err) {
    if (err) {
      handleError(res, err.message, "Failed to delete entity");
    } else {
      res.status(200).json(req.params.id);
    }
  });
});
