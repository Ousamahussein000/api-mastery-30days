const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const prisma = new PrismaClient()

async function main() {
    // --- Users ---
    const adminPassword = await bcrypt.hash('Admin@123', 10)
    const clientPassword = await bcrypt.hash('Client@123', 10)

    const admin = await prisma.user.create({
        data: { name: 'Admin', email: 'admin@bookstore.com', password: adminPassword, role: 'admin' }
    })

    const client = await prisma.user.create({
        data: { name: 'John Doe', email: 'john@example.com', password: clientPassword, role: 'client' }
    })

    // --- Categories ---
    const fiction = await prisma.category.create({
        data: { name: 'Fiction', section: 'Literature' }
    })
    const scifi = await prisma.category.create({
        data: { name: 'Science Fiction', section: 'Literature' }
    })
    const selfhelp = await prisma.category.create({
        data: { name: 'Self-Help', section: 'Non-Fiction' }
    })
    const tech = await prisma.category.create({
        data: { name: 'Technology', section: 'Non-Fiction' }
    })

    // --- Authors ---
    const robert = await prisma.author.create({
        data: { name: 'Robert Martin', nationality: 'American', bio: 'Software engineer and author' }
    })
    const kyle = await prisma.author.create({
        data: { name: 'Kyle Simpson', nationality: 'American', bio: 'JavaScript expert and educator' }
    })
    const george = await prisma.author.create({
        data: { name: 'George Orwell', nationality: 'British', bio: 'Novelist and essayist' }
    })
    const frank = await prisma.author.create({
        data: { name: 'Frank Herbert', nationality: 'American', bio: 'Science fiction author' }
    })

    // --- Books ---
    await prisma.book.createMany({
        data: [
            { title: 'Clean Code', price: 29.99, stock: 15, authorId: robert.id, categoryId: tech.id },
            { title: 'The Pragmatic Programmer', price: 39.99, stock: 10, authorId: robert.id, categoryId: tech.id },
            { title: 'You Don\'t Know JS', price: 24.99, stock: 8, authorId: kyle.id, categoryId: tech.id },
            { title: '1984', price: 14.99, stock: 20, authorId: george.id, categoryId: fiction.id },
            { title: 'Animal Farm', price: 9.99, stock: 25, authorId: george.id, categoryId: fiction.id },
            { title: 'Dune', price: 19.99, stock: 12, authorId: frank.id, categoryId: scifi.id },
            { title: 'Dune Messiah', price: 17.99, stock: 7, authorId: frank.id, categoryId: scifi.id },
        ]
    })

    console.log('✅ Seeded users, categories, authors, books')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())