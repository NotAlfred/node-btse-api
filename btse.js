(async () => {
    const crypto = require("crypto-js");
    const EventEmitter = require("events");
    const axios = require("axios");
    const WebSocket = require("ws");
    const fs = require("fs");
    const exports = module.exports;

    const _baseURL = "https://api.btse.com/futures";

    let _key = "",
        _secret = "",
        _feed;

    const emitter = new EventEmitter();

    const instance = axios.create({
        headers: {
            "Content-Type": "application/json",
            "User-Agent": "node-btse-api"
        },
        timeout: 30000,
        _baseURL
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
            const message = (params && method !== "GET") ? `${endpoint}${timestamp}${JSON.stringify(params)}`: `${endpoint}${timestamp}`;
            const signature = crypto["HmacSHA384"](message, _secret);
            const query = (method === "GET" && params) ? `?${Object.entries(params).map(([key, val]) => `${key}=${val}`).join("&")}` : "";
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
        if (!_key || !_secret) throw "Invalid key, or secret";
    }

    exports.config = (key, secret) => {
        if (!key || !secret) throw "Invalid key, or secret";
        _key = key;
        _secret = secret;
    }

    /**
     * Public endpoints
     */

    // Retrieves funding history
    exports.fundingHistory = async (symbol = undefined) => {
        return request(
            "/api/v2.1/funding_history",
            {
                symbol
            });
    };

    // OHLCV Data
    exports.ohlcv = async (symbol, resolution = 30, start = undefined, end = undefined) => {
        return request(
            "/api/v2.1/ohlcv",
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
            "/api/v2.1/ohlcv",
            {
                symbol,
                depth: depth.toString(),
            }
        );
    };

    // Market Summaries
    exports.markets = async (symbol = undefined) => {
        return request(
            "/api/v2.1/market_summary",
            {
                symbol,
            }
        );
    };

    // Get price index
    exports.price = async (symbol = undefined) => {
        return request(
            "/api/v2.1/price",
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
            "/api/v2.1/trades",
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
            "/api/v2.1/user/wallet",
            (wallet) ? {
                wallet,
            } : undefined
        );
    };

    // Orders dead man switch
    exports.balance = async (timeout = 60000) => {
        return signedRequest(
            "/api/v2.1/order/cancelAllAfter",
            {
                timeout
            }
        );
    };

    /**
     * WebSockets
     */

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
})();