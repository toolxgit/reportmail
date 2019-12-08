const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce');
const querystring = require('querystring');
const request = require('request');

const PORT = 3000;
const scopes = 'write_products';
const forwardingAddress = 'https://39a927aa.ngrok.io';

const apiKey = process.env.SHOPIFY_APP_KEY
const apiSecret = process.env.SHOPIFY_APP_SECRET

app.get('/', (req, res) => {
    res.send('HEllo world');
});

app.get('/shopify', (req, res) => {
    const shop = req.query.shop;
    if (shop) {
        const state = nonce();
        const redirectUrl = forwardingAddress + '/shopify/callback';

        const installUrl = 'https://' + shop + '/admin/oauth/authorize?client_id=' + apiKey +
            '&scope=' + scopes +
            '&state=' + state +
            '&redirect_uri=' + redirectUrl;

        res.cookie('state', state);
        res.redirect(installUrl);

    } else {
        return res.status(400).send("No shop found in this address");
    }
});

app.listen(PORT, () => {
    console.log(`App is running at ${PORT}`);
})