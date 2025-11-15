module.exports = {
  apps : [{
    name: "observerPapu",
    script: "./node_modules/ts-node/dist/bin.js",
    args: "./ObserverPapu_bot.ts",
    interpreter: "node",
    cwd: "./",
    watch: false,
    env: {
      "NODE_ENV": "production"
    }
  }]
}