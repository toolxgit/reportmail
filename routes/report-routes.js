const router = require('express').Router();
const nonce = require('nonce')();
const cookie = require('cookie');

const querystring = require('querystring');
const request = require('request-promise');
const crypto = require('crypto');
const Shopify = require('shopify-api-node');

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'read_products,read_orders';
const forwardingAddress = "https://d2a5ecd2.ngrok.io";


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

                // const shopify = new Shopify({
                //     shopName: shop,
                //     accessToken: accessToken
                // });

                // shopify.order
                //     .list({ limit: 5 })
                //     .then((orders) => console.log(orders))
                //     .catch((err) => console.error(err));


                res.status(200).send("Got an access token, let's do something with it");
            })
            .catch((error) => {
                res.status(error.statusCode).send(error);
            });

    } else {
        res.status(400).send('Required parameters missing');
    }
});

router.get('/get-products', (req, res) => {
    const { shop } = req.query;
    try {
        //let url = `https://${shop}/admin/products.json`;
        let url = `https://${shop}/admin/api/2019-10/orders.json?status=closed&financial_status=paid`;

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
                console.log(orders.orders);
                res.status(200).send("Products listed");
            })
            .catch((error) => {
                console.log(error);
                res.status(500).send("Something went wrong");
            })

    } catch (error) {
        res.send("No access token available");
    }
})


module.exports = router;