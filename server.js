const express = require('express');
const app = express();
const nunjucks = require('nunjucks');
const bodyParser = require('body-parser');
const mongoDB = require('mongodb-legacy');
const mongoClient = mongoDB.MongoClient;
const HOST = 'localhost';
const dbPort = '27017';
const dbURL = `mongodb://${HOST}`;
const dbName = 'project';
const dbCollection = 'users';
const PORT = 3000;
const port = (process.env.PORT || PORT);
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
};

let db;

/*
 * Configure the “views” folder to work with Nunjucks
 */
nunjucks.configure('views', {
    express: app,
    autoescape: true
});

/*
 * Configure the Node MongoDB client to connect to Mongo, establish a database
 * connection, and assigning the reference to the “db” variable defined on line
 * 21
 */
mongoClient.connect(`${dbURL}:${dbPort}`, (err, client) => {
    if (err) {
        return console.log(err);
    } else {
        db = client.db(dbName);
        console.log('MongoDB successfully connected:');
        console.log('\tMongo URL:', colors.green, dbURL, colors.reset);
        console.log('\tMongo port:', colors.green, dbPort, colors.reset);
        console.log('\tMongo database name:', colors.green, dbName, colors.reset, '\n');
    }
});

/*
 * Configure Node to act as a web server
 */
app.listen(port, HOST, () => {
    console.log('Host successfully connected:');
    console.log('\tServer URL:', colors.green, 'localhost', colors.reset);
    console.log('\tServer port:', colors.green, port, colors.reset);
    console.log('\tVisit http://localhost:' + port + '\n');
});

/*
 * Express’s way of setting a variable. In this case, set the variable “view
 * engine” to “njk” for Nunjucks
 */
app.set('view engine', 'njk');

/*
 * Express’s middleware to parse incoming, form-based request data before
 * processing form data
 */
app.use(bodyParser.urlencoded({ extended: true }));

/*
 * Express’s middleware to parse incoming request bodies before handlers
 */
app.use(bodyParser.json());

/*
 * Express’s middleware to serve HTML, CSS, and JavaScript files from the
 * included “public” folder. Note: There are no JavaScript files in the
 * “public” folder
 */
app.use(express.static('public'));

/*
 * This router handles GET requests to the root of the web site
 */
app.get('/', (req, res) => {
    console.log('User requested root of web site.');
    res.render('index.njk');
});

/*
 * This router handles GET requests to http://localhost:3000/read-a-db-record/
 */
app.get('/read-a-db-record', (req, res) => {
    db.collection(dbCollection).find().toArray((err, arrayObject) => {
        if (err) {
            return console.log(err);
        } else {
            console.log('User requested http://' + HOST + ':' + port + '/read-a-db-record.');
            res.render('read-from-database.njk', { mongoDBArray: arrayObject });
        }
    });
});

/*
 * This router handles GET requests to
 * http://localhost:3000/create-a-db-record/
 */
app.get('/create-a-db-record', (req, res) => {
    res.render('create-a-record-in-database.njk');
});

/*
 * This router handles POST requests — via the Nunjucks partial
 * “create-a-record-in-database.njk” — submitted from the form located at
 * http://localhost:3000/create-a-db-record/
 */
app.post('/create-a-db-record', (req, res) => {
    db.collection(dbCollection).insertOne(req.body, (err) => {
        if (err) {
            return console.log(err);
        } else {
            console.log('Inserted one record into Mongo via an HTML form using POST.\n');
            res.redirect('/read-a-db-record');
        }
    });
});

/*
 * This router handles GET requests to
 * http://localhost:3000/update-a-db-record/
 */
app.get('/update-a-db-record', (req, res) => {
    db.collection(dbCollection).find().toArray((err, arrayObject) => {
        if (err) {
            return console.log(err);
        } else {
            console.log('User requested the resource http://' + HOST + ':' + port + '/update-a-db-record');
            res.render('update-a-record-in-database.njk', { mongoDBArray: arrayObject });
        }
    });
});

app.post('/update-a-db-record', async (req, res) => {
    try {
        console.log('Request body:', req.body); // Debugging log
        const { id, name, email, phone } = req.body;

        // Validate incoming fields
        if (!id || !name || !email || !phone) {
            console.log('Missing required fields:', req.body); // Log what's missing
            return res.status(400).send('Missing required fields.');
        }

        const updatedData = { name, email, phone };

        // Update the record
        const result = await db.collection(dbCollection).updateOne(
            { _id: new mongoDB.ObjectId(id) }, // Convert id to ObjectId
            { $set: updatedData }
        );

        if (result.matchedCount === 0) {
            console.log(`No record found with _id: ${id}`);
            return res.status(404).send('Record not found.');
        }

        console.log(`Successfully updated record with _id: ${id}`);
        res.redirect('/read-a-db-record'); // Redirect to the page where records are displayed
    } catch (err) {
        console.error('Error updating record:', err);
        res.status(500).send('Internal server error.');
    }
});

/*
 * This router handles GET requests to
 * http://localhost:3000/delete-a-db-record/
 */
app.get('/delete-a-db-record', (req, res) => {
    db.collection(dbCollection).find().toArray((err, arrayObject) => {
        res.render('delete-a-record-in-database.njk', { mongoDBArray: arrayObject });
    });
});

app.post(`/delete-a-db-record`, async (req, res) => {
  const userId = req.body.name;

  if (!userId) {
      return res.status(400).send("User ID is required to delete a record.");
  }

  try {
      const result = await db.collection(dbCollection).deleteOne({ name: userId });

      if (result.deletedCount === 0) {
          return res.status(404).send("No record found to delete.");
      }

      console.log("Successfully deleted the record.");
      res.redirect(`/read-a-db-record`);
  } catch (err) {
      console.error("Error deleting record:", err);
      res.status(500).send("Internal Server Error");
  }
});
