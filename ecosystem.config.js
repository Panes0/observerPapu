module.exports = {
  apps : [{
    name: "observerPapu",
    script: "ts-node",
    args: ["./ObserverPapu_bot.ts"],    // o el archivo .py de tu bot
    interpreter: "none", // importante en Windows
    cwd: "./",           // path del proyecto
    watch: false
  }]
}