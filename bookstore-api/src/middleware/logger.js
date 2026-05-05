const logger = (req, res, next) => {
    const start = Date.now()


    res.on('finish', () => {
        const duration = Date.now() - start
        console.log(`${req.method} ${req.path} → ${req.statusCode} (${duration}ms)`)
    })
    next()
}
module.exports = logger