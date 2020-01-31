const router = require('express').Router();
const nonce = require('nonce')();
const cookie = require('cookie');
const mongoose = require('mongoose');

const querystring = require('querystring');
const request = require('request-promise');
const crypto = require('crypto');

const uri = "mongodb+srv://root:root@cluster0-pstwe.mongodb.net/test?retryWrites=true&w=majority";

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'read_products,read_orders';
const forwardingAddress = "https://toolx-temp.herokuapp.com";

mongoose.connect(uri,(err,connection)=>{
    if(err){
        console.log(err);
    }else {
        console.log("DB Connected");
    }
});


var connection = mongoose.connection;


router.get('/shopify', (req, res) => {
    const shop = req.query.shop;
    if (shop) {
        const state = nonce();
        const redirectUri = forwardingAddress + '/shopify/callback';
        const installUrl = 'https://' + shop +
            '/admin/oauth/authorize?client_id=' + apiKey +
            '&scope=' + scopes +
            '&state=' + state +
            '&redirect_uri=' + redirectUri;

        res.cookie('state', state);
        res.redirect(installUrl);
    } else {
        return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
    }
});

router.get('/shopify/callback', (req, res) => {
    const { shop, hmac, code, state } = req.query;
    const stateCookie = cookie.parse(req.headers.cookie).state;

    if (state !== stateCookie) {
        return res.status(403).send('Request origin cannot be verified');
    }

    if (shop && hmac && code) {
        const map = Object.assign({}, req.query);
        delete map['signature'];
        delete map['hmac'];
        const message = querystring.stringify(map);
        const providedHmac = Buffer.from(hmac, 'utf-8');
        const generatedHash = Buffer.from(
            crypto
                .createHmac('sha256', apiSecret)
                .update(message)
                .digest('hex'),
            'utf-8'
        );
        let hashEquals = false;

        try {
            hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
        } catch (e) {
            hashEquals = false;
        };

        if (!hashEquals) {
            return res.status(400).send('HMAC validation failed');
        }

        const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
        const accessTokenPayload = {
            client_id: apiKey,
            client_secret: apiSecret,
            code,
        };

        request.post(accessTokenRequestUrl, { json: accessTokenPayload })
            .then((accessTokenResponse) => {
                const accessToken = accessTokenResponse.access_token;

                process.env.ACCESS_TOKEN = accessToken;
                process.env.SHOP_NAME = shop;
                res.status(200).send("Got an access token, let's do something with it");
            })
            .catch((error) => {
                res.status(error.statusCode).send(error);
            });

    } else {
        res.status(400).send('Required parameters missing');
    }
});


function getDataIntoDb() {
  let url = `https://${process.env.SHOP_NAME}/admin/api/2019-10/orders.json?created_at_min=2004-01-01`;

  let options = {
      method: 'GET',
      url: url,
      json: true,
      headers: {
          'X-Shopify-Access-Token': process.env.ACCESS_TOKEN,
          'content-type': 'application/json'
      }
  };

  request(options)
    .then((orders) => {
      res.json(orders);
    })

}


module.exports = router;

