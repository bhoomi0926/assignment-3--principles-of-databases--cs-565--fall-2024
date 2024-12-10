const express = require(`express`);
const app = express();
const nunjucks = require(`nunjucks`);
const bodyParser = require(`body-parser`);
const mongoDB = require(`mongodb-legacy`);
const mongoClient = mongoDB.MongoClient;
const HOST = `localhost`;
const dbPort = `27017`;
const dbURL = `mongodb://${HOST}`;
const dbName = `project`;
const dbCollection = `users`;
const PORT = 3000;
const port = (process.env.PORT || PORT);
const colors = {
    reset: `\x1b[0m`,
    red: `\x1b[31m`,
    green: `\x1b[32m`,
    yellow: `\x1b[33m`,
};

let db;

/*
 * Configure the “views” folder to work with Nunjucks
 */
nunjucks.configure(`views`, {
    express: app,
    autoescape: true
});

/*
 * Configure the Node MongoDB client to connect to Mongo, establish a database
 * connection, and assign the reference to the “db” variable defined on line
 * 21
 */
mongoClient.connect(`${dbURL}:${dbPort}`, (err, client) => {
    if (err) {
        return console.log(err);
    } else {
        db = client.db(dbName);

        console.log(`MongoDB successfully connected:`);
        console.log(`\tMongo URL:`, colors.green, dbURL, colors.reset);
        console.log(`\tMongo port:`, colors.green, dbPort, colors.reset);
        console.log(`\tMongo database name:`, colors.green, dbName, colors.reset, `\n`);
    }
});

/*
 * Configure Node to act as a web server
 */
app.listen(port, HOST, () => {
    console.log(`Host successfully connected:`);
    console.log(`\tServer URL:`, colors.green, `localhost`, colors.reset);
    console.log(`\tServer port:`, colors.green, port, colors.reset);
    console.log(`\tVisit http://localhost:${port}\n`);
});

/*
 * Express’s way of setting a variable. In this case, set the variable “view
 * engine” to “njk” for Nunjucks
 */
app.set(`view engine`, `njk`);

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
app.use(express.static(`public`));

/*
 * This router handles GET requests to the root of the web site
 */
app.get(`/`, (req, res) => {
    console.log(`User requested root of web site.`);
    console.log(`Responding to request with file`, colors.green, `index.njk`, colors.reset, `via GET.`);
    res.render(`index.njk`);
});

/*
 * This router handles GET requests to http://localhost:3000/read-a-db-record/
 */
app.get(`/read-a-db-record`, (req, res) => {
    db.collection(dbCollection).find().toArray((err, arrayObject) => {
        if (err) {
            return console.log(err);
        } else {
            console.log(`User requested http://${HOST}:${port}/read-a-db-record.`);
            console.log(`Responding to request with file`, colors.green, `read-from-database.njk`, colors.reset, `via GET.\n`);
            res.render(`read-from-database.njk`, { mongoDBArray: arrayObject });
        }
    });
});

/*
 * This router handles GET requests to http://localhost:3000/create-a-db-record/
 */
app.get(`/create-a-db-record`, (req, res) => {
    res.render(`create-a-record-in-database.njk`);
});

/*
 * This router handles POST requests — via the Nunjucks partial
 * “create-a-record-in-database.njk” — submitted from the form located at
 * http://localhost:3000/create-a-db-record/
 */
app.post(`/create-a-db-record`, (req, res) => {
    db.collection(dbCollection).insertOne(req.body, (err) => {
        console.log(req.body);

        if (err) {
            return console.log(err);
        } else {
            console.log(`Inserted one record into Mongo via an HTML form using POST.\n`);
            res.redirect(`/read-a-db-record`);
        }
    });
});

/*
 * This router handles GET requests to http://localhost:3000/update-a-db-record/
 */
app.get(`/update-a-db-record`, (req, res) => {
    db.collection(dbCollection).find().toArray((err, arrayObject) => {
        if (err) {
            return console.log(err);
        } else {
            console.log(`User requested the resource http://${HOST}:${port}/update-a-db-record`);
            res.render(`update-a-record-in-database.njk`, { mongoDBArray: arrayObject });
        }
    });
});

/*
 * This router handles POST requests for updating records
 */
app.post(`/update-a-db-record`, (req, res) => {
    db.collection(dbCollection).updateOne(
        { name: req.body.name },
        {
            $set: {
                password: req.body.password
            }
        },
        (err, result) => {
            if (err) {
                console.log(`${colors.red}UPDATE POST: Error = `, err);
            } else {
                if (result.acknowledged) {
                    console.log(`${colors.green}UPDATE POST: Updated User ${req.body.name}'s password`);
                } else {
                    console.log(`${colors.red}UPDATE POST: Unsuccessful`);
                }
            }
        }
    );
    res.redirect(`/update-a-db-record`);
});

/*
 * This router handles GET requests to http://localhost:3000/delete-a-db-record/
 */
app.get(`/delete-a-db-record`, (req, res) => {
    db.collection(dbCollection).find().toArray((err, arrayObject) => {
        res.render(`delete-a-record-in-database.njk`, { mongoDBArray: arrayObject });
    });
});

/*
 * This router handles POST requests to delete records
 */
app.post(`/delete-a-db-record`, (req, res) => {
    db.collection(dbCollection).findOne({ name: req.body.name }, (err, result) => {
        if (err) {
            console.log(`${colors.red}DELETE POST: Error = `, err);
        } else {
            if (result) {
                console.log(`${colors.green}DELETE POST: Found user ${req.body.name}, proceeding with deletion.`);
                db.collection(dbCollection).deleteOne(req.body, (err, result) => {
                    if (err) {
                        console.log(`${colors.red}DELETE POST: Error during deletion = `, err);
                    } else {
                        if (result.acknowledged) {
                            console.log(`${colors.green}DELETE POST: Deleted ${result.deletedCount} User${result.deletedCount > 1 ? 's' : ''} Name ${req.body.name}`);
                        } else {
                            console.log(`${colors.red}DELETE POST: Unsuccessful`);
                        }
                    }
                });
            } else {
                console.log(`${colors.red}DELETE POST: User ${req.body.name} not found`);
            }
        }
    });
    res.redirect("/delete-a-db-record");
});
