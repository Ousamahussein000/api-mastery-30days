const app = require('./src/app')

process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason))
process.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err); process.exit(1) })

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Bookstore API running on http://localhost:${PORT}`))