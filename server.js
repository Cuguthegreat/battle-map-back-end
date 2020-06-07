const express = require('express');
const bodyParser = require('body-parser');
const mongodb = require('mongodb');
const ObjectID = mongodb.ObjectID;
const cors = require('cors');

const url = require('url');

const BOARDS = 'boards';
const PIECES = 'pieces';
const CELLS = 'cells';

const app = express();
app.use(bodyParser.json());
app.use(cors());

const uri = 'mongodb+srv://dbUser:dbUserPassword@cluster0-udc2e.mongodb.net/prod';

const server = app.listen(process.env.PORT || 8080, () => {
    console.log('App now running on port', server.address().port);
});

let database;

mongodb.MongoClient.connect(uri, (err, client) => {
    if (err) {
        console.log(err);
        process.exit(1);
    }
    database = client.db();
    console.log('Database connection ready');
});

const handleError = (res, reason, message, code) => {
    console.log('ERROR: ' + reason);
    res.status(code || 500).json({'error': message});
};

const getEntities = collectionName => (req, res) => {
    const queryObject = url.parse(req.url, true).query;
    const query = {
        ...(queryObject.boardId && {boardId: queryObject.boardId}),
        ...(queryObject.changedSince && {changeDate: { $gte: new Date(queryObject.changedSince)}})
    };

    database.collection(collectionName).find(query).toArray()
        .then(docs => res.status(200).json(docs))
        .catch(err => handleError(res, err.message, `Failed to fetch ${collectionName}.`))
};

const postEntity = collectionName => (req, res) => {
    const newEntity = req.body;

    if (!newEntity) {
        handleError(res, 'Invalid request', 'Must provide data.', 400);
    } else {
        newEntity.createDate = new Date();
        database.collection(collectionName).insertOne(newEntity)
            .then(doc => res.status(201).json(doc.ops[0]))
            .catch(err => handleError(res, err.message, 'Failed to create new entity.'));
    }
};

const getEntity = collectionName => (req, res) => {
    database.collection(collectionName).findOne({_id: new ObjectID(req.params.id)})
        .then(doc => res.status(200).json(doc))
        .catch(err => handleError(res, err.message, 'Failed to get entity.'));
};

const putEntity = collectionName => (req, res) => {
    const updateDoc = req.body;

    if (!updateDoc) {
        handleError(res, 'Invalid request', 'Must provide data.', 400);

    } else {
        delete updateDoc._id;
        updateDoc['$set'].changeDate = new Date();

        database.collection(collectionName).updateOne({_id: new ObjectID(req.params.id)}, updateDoc)
            .then(() => {
                updateDoc._id = req.params.id;
                res.status(200).json(updateDoc);
            })
            .catch(err => handleError(res, err.message, 'Failed to update entity.'));
    }
};

const deleteEntity = collectionName => (req, res) => {
    database.collection(collectionName).deleteOne({_id: new ObjectID(req.params.id)})
        .then(() => res.status(200).json(req.params.id))
        .catch(err => handleError(res, err.message, 'Failed to delete entity.'));
};

[BOARDS, PIECES, CELLS].forEach(entityType => {
    app.get(`/api/${entityType}`, getEntities(entityType));
    app.post(`/api/${entityType}`, postEntity(entityType));
    app.get(`/api/${entityType}/:id`, getEntity(entityType));
    app.put(`/api/${entityType}/:id`, putEntity(entityType));
    app.delete(`/api/${entityType}/:id`, deleteEntity(entityType));
});

app.get('/api/currentDate', (req, res) => {
    res.status(200).json({currentDate: new Date()})
});