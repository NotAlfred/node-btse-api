(async () => {
    const crypto = require("crypto-js");
    const EventEmitter = require("events");
    const axios = require("axios");
    const WebSocket = require("ws");
    const fs = require("fs");
    const exports = module.exports;

    const _baseURL = "https://api.btse.com/";

    let _key = "",
        _secret = "",
        _market = "spot",
        _version = "v3.2",
        _feed;

    const emitter = new EventEmitter();
    const instance = axios.create({
        headers: {
            "Content-Type": "application/json",
            "User-Agent": "node-btse-api"
        },
        timeout: 30000,
        baseURL: _baseURL
    });

    async function request(url, params = {}) {
        return new Promise((resolve, reject) => {
            instance.get(url, {
                params
            })
                .then(response => {
                    resolve(response.data);
                })
                .catch(error => {
                    if (error.response) console.warn(error.response.data);
                    reject(error.message);
                });
        });
    }

    async function signedRequest(endpoint, params = undefined, method = "GET") {
        return new Promise((resolve, reject) => {
            const timestamp = Date.now();
            const route = endpoint.replace(`${_market}`, "");
            const message = (params && method !== "GET" && method !== "DELETE") ? `${route}${timestamp}${JSON.stringify(params)}`: `${route}${timestamp}`;
            const signature = crypto["HmacSHA384"](message, _secret);
            Object.keys(params).forEach(key => params[key] === undefined && delete params[key])
            const query = ((method === "GET" || method === "DELETE") && params) ? `?${Object.entries(params).map(([key, val]) => `${key}=${val}`).join("&")}` : "";
            const authOptions = {
                method,
                url: _baseURL + endpoint + query,
                headers: {
                    "Content-Type": "application/json",
                    "btse-nonce": timestamp,
                    "btse-api": _key,
                    "btse-sign": signature.toString()
                },
                data: params,
            };
            return axios(authOptions).then(response => {
                resolve(response.data);
            }).catch(error => {
                if (error.response) reject(error.response.data);
            });
        });
    }

    exports.configFile = (file) => {
        const json = JSON.parse(fs.readFileSync(file, "utf8"));
        _key = json.key;
        _secret = json.secret;
        _market = json.market;
        _version = json.version;
        if (!_key || !_secret) throw "Invalid key, or secret";
    }

    exports.config = (key, secret, market = "spot", version = "v3.2") => {
        if (!key || !secret) throw "Invalid key, or secret";
        _key = key;
        _secret = secret;
        _market = market;
        _version = version;
    }

    /**
     * Public endpoints
     */

    // Retrieves funding history
    exports.fundingHistory = async (symbol = undefined) => {
        return request(
            `${_market}/api/${_version}/funding_history`,
            {
                symbol
            });
    };

    // OHLCV Data
    exports.ohlcv = async (symbol, resolution = 30, start = undefined, end = undefined) => {
        return request(
            `${_market}/api/${_version}/ohlcv`,
            {
                symbol,
                resolution,
                start,
                end
            }
        );
    };

    // Market Depth
    exports.orderBook = async (symbol, depth = "10") => {
        return request(
            `${_market}/api/${_version}/ohlcv`,
            {
                symbol,
                depth: depth.toString(),
            }
        );
    };

    // Market Summaries
    exports.markets = async (symbol = undefined) => {
        return request(
            `${_market}/api/${_version}/market_summary`,
            {
                symbol,
            }
        );
    };

    // Get price index
    exports.price = async (symbol = undefined) => {
        return request(
            `${_market}/api/${_version}/price`,
            {
                symbol,
            }
        );
    };

    // Get all trades
    exports.trades = async (symbol = undefined,
                            start = undefined,
                            end = undefined,
                            count = 50,
                            includeOld = false) => {
        return request(
            `${_market}/api/${_version}/trades`,
            {
                symbol,
                "startTime": start,
                "endTime": end,
                count,
                includeOld,
            }
        );
    };

    /**
     * Authenticated endpoints
     */

    // Account balances
    exports.balance = async (wallet = undefined) => {
        return signedRequest(
            `${_market}/api/${_version}/user/wallet`,
            (wallet) ? {
                wallet,
            } : undefined
        );
    };

    // Limit buy order
    exports.limitBuy = async (symbol, size, price) => {
        return signedRequest(
            `${_market}/api/${_version}/order`, {
                symbol,
                size,
                price,
                type: "LIMIT",
                side: "BUY"
            },
            "POST"
        );
    };

    // Limit sell order
    exports.limitSell = async (symbol, size, price) => {
        return signedRequest(
            `${_market}/api/${_version}/order`,{
                symbol,
                size,
                price,
                type: "LIMIT",
                side: "SELL",
            },
            "POST"
        );
    };

    // market buy order
    exports.marketBuy = async (symbol, size) => {
        return signedRequest(
            `${_market}/api/${_version}/order`, {
                symbol,
                size,
                type: "MARKET",
                side: "BUY"
            },
            "POST"
        );
    };

    // market sell order
    exports.marketSell = async (symbol, size) => {
        return signedRequest(
            `${_market}/api/${_version}/order`, {
                symbol,
                size,
                type: "MARKET",
                side: "SELL",
            },
            "POST"
        );
    };

    // Get open orders
    exports.openOrders = async (symbol, orderID = undefined, clOrderID = undefined) => {
        return signedRequest(
            `${_market}/api/${_version}/user/open_orders`, {
                symbol,
                orderID,
                clOrderID
            },
            "GET"
        );
    };

    // Cancel order
    exports.cancelOrder = async (symbol, orderID = undefined, clOrderID = undefined) => {
        return signedRequest(
            `${_market}/api/${_version}/order`, {
                symbol,
                orderID,
                clOrderID
            },
            "DELETE"
        );
    };

    // Orders dead man switch
    exports.cancelAllAfter = async (timeout = 60000) => {
        return signedRequest(
            `${_market}/api/${_version}/order/cancelAllAfter`,
            {
                timeout
            }
        );
    };

    /**
     * WebSockets
     */
/*
    function subscribe(payload, events) {
        for (const event of events) {
            emitter.on(event.name, (data) => {
                if (event.callback) {
                    event.callback(data);
                } else {
                    console.log(data);
                }
            });
        }
        _feed.send(JSON.stringify(payload));
    }

 */
})();