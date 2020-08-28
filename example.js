(async () => {
    const btse = require("node-btse-api");

    const symbol = "BTSE-USDT";

    /**
     * Can setup with your API keys in a file or directly in as arguments
     */
    await btse.configFile("options.json");
    // await btse.config("", "");

    // await btse.fundingHistory();
    await btse.fundingHistory(symbol);

    /**
     * Supported resolutions:
     * 1: 1 min
     * 5: 5 min
     * 15: 15 min
     * 30: 30 min
     * 60: 1 hour
     * 360: 6 hours
     * 1440: 1 day
     */
    // await btse.ohlcv(symbol);
    await btse.ohlcv(symbol, 1440, 1591369420, 1591337420);

    // await btse.orderBook(symbol);
    await btse.orderBook(symbol, 5);

    // await btse.markets();
    await btse.markets(symbol);

    // await btse.price();
    await btse.price(symbol);

    // await btse.trades()
    await btse.trades(symbol, undefined, undefined, 42, false);

    // Authenticated Endpoints
    await btse.balance();
    await btse.limitSell(symbol, 1, 5);
    await btse.openOrders(symbol);
    await btse.cancelOrder(symbol);

    // Orders dead man's switch
    await btse.cancelAllAfter();

})().catch(e => console.log(e));