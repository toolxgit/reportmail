const dotenv = require('dotenv').config();
const express = require('express');
const app = express();


const reportRoutes = require('./routes/report-routes');


app.use('/', reportRoutes);

app.listen(3000, () => {
    console.log('Example app listening on port 3000!');
});