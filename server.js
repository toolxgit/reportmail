const dotenv = require('dotenv').config();
const express = require('express');
const app = express();


const PORT = process.env.PORT;

const reportRoutes = require('./routes/report-routes');


app.use('/', reportRoutes);

app.listen(PORT, () => {
    console.log('Example app listening on port 3000!');
});