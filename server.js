const dotenv = require('dotenv').config();
const express = require('express');
const app = express();

const dbConfig = require('./config/db_config');

const PORT = process.env.PORT;

const reportRoutes = require('./routes/report-routes');


// MongoClient.connect(uri,(err, client) => {
//     if(err){
//         console.log(err);
//         throw err;
//     }
//     console.log('Connected...');
// });

app.use('/', reportRoutes);

app.listen(PORT, () => {
    console.log('Example app listening on port 3000!');
});