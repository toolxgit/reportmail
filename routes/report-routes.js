const router = require('express').Router();
const nonce = require('nonce')();
const cookie = require('cookie');

const querystring = require('querystring');
const request = require('request-promise');
const crypto = require('crypto');

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'read_products,read_orders';
const forwardingAddress = "https://toolx-temp.herokuapp.com";

const mongoose = require('mongoose');

function connectDb() {
    mongoose.connect('mongodb+srv://root:root@cluster0-pstwe.mongodb.net/test?retryWrites=true&w=majority', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, (err) => {
        console.log(err);
    })
}

connectDb();

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
                res.status(200).send("Got an access token, let's do something with it");
            })
            .catch((error) => {
                res.status(error.statusCode).send(error);
            });

    } else {
        res.status(400).send('Required parameters missing');
    }
});


//Get daily revenue based on all paid orders
router.get('/get-daily-revenue', (req, res) => {
    const { shop, month, year, day } = req.query;
    try {
        //let url = `https://${shop}/admin/api/${year}-${month}/orders.json?financial_status=paid`;
        let url = `https://${shop}/admin/api/2019-10/orders.json?created_at_min=${year}-${month}-${day}`;

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
                let currentOrderCount = 0;
                let currentOrderRevenue = 0;
                let lastYearOrderCount = 0;
                let lastYearOrderRevenue = 0;

                orders.orders.forEach(order => {
                    if (order.created_at.includes(`${year}-${month}-${day}`)) {
                        currentOrderCount += 1;
                        currentOrderRevenue += parseFloat(order.total_price);
                    }
                    if (order.created_at.includes(`${year - 1}-${month}-${day}`)) {
                        lastYearOrderCount += 1;
                        lastYearOrderRevenue += parseFloat(order.total_price);
                    }
                });
                res.status(200).json({
                    "success": true,
                    "CurrentYearOrderCount": currentOrderCount,
                    "CurrentYearOrderRevenue": currentOrderRevenue,
                    "LastYearOrderCount": lastYearOrderCount,
                    "LastYearOrderRevenue": lastYearOrderRevenue
                });
            })
            .catch((error) => {
                res.status(404).json({ success: false, message: "No orders found" });
            })

    } catch (error) {
        res.send("No access token available");
    }
});


//Get monthly revenue based on all paid orders
router.get('/get-monthly-revenue', (req, res) => {
    const { shop, month, year } = req.query;
    try {
        //let url = `https://${shop}/admin/api/${year}-${month}/orders.json?financial_status=paid`;
        let url = `https://${shop}/admin/api/2019-10/orders.json?created_at_min=${year}-${month}-01`;

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
                let currentOrderCount = 0;
                let currentOrderRevenue = 0;
                let lastYearOrderCount = 0;
                let lastYearOrderRevenue = 0;

                orders.orders.forEach(order => {
                    if (order.created_at.includes(`${year}-${month}`)) {
                        currentOrderCount += 1;
                        currentOrderRevenue += parseFloat(order.total_price);
                    }
                    if (order.created_at.includes(`${year - 1}-${month}`)) {
                        lastYearOrderCount += 1;
                        lastYearOrderRevenue += parseFloat(order.total_price);
                    }
                });
                res.status(200).json({
                    "success": true,
                    "CurrentYearOrderCount": currentOrderCount,
                    "CurrentYearOrderRevenue": currentOrderRevenue,
                    "LastYearOrderCount": lastYearOrderCount,
                    "LastYearOrderRevenue": lastYearOrderRevenue
                });
            })
            .catch((error) => {
                res.status(404).json({ success: false, message: "No orders found" });
            })

    } catch (error) {
        res.send("No access token available");
    }
});


//Get yearly revenue based on all paid orders
router.get('/get-yearly-revenue', (req, res) => {
    const { shop, year } = req.query;
    try {
        //let url = `https://${shop}/admin/api/${year}-${month}/orders.json?financial_status=paid`;
        let url = `https://${shop}/admin/api/2019-10/orders.json?created_at_min=${year}-01-01`;

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
                let currentOrderCount = 0;
                let currentOrderRevenue = 0;
                let lastYearOrderCount = 0;
                let lastYearOrderRevenue = 0;

                orders.orders.forEach(order => {
                    if (order.created_at.includes(`${year}`)) {
                        currentOrderCount += 1;
                        currentOrderRevenue += parseFloat(order.total_price);
                    }
                    if (order.created_at.includes(`${year - 1}`)) {
                        lastYearOrderCount += 1;
                        lastYearOrderRevenue += parseFloat(order.total_price);
                    }
                });
                res.status(200).json({
                    "success": true,
                    "CurrentYearOrderCount": currentOrderCount,
                    "CurrentYearOrderRevenue": currentOrderRevenue,
                    "LastYearOrderCount": lastYearOrderCount,
                    "LastYearOrderRevenue": lastYearOrderRevenue
                });
            })
            .catch((error) => {
                res.status(404).json({ success: false, message: "No orders found" });
            })

    } catch (error) {
        res.send("No access token available");
    }
});


module.exports = router;