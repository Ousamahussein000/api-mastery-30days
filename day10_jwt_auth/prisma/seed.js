const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {

    // Authors
    const author1 = await prisma.author.create({
        data: {
            name: 'Robert Martin',
            nationality: 'American',
            bio: 'Author of Clean Code and Clean Architecture'
        }
    })
    const author2 = await prisma.author.create({
        data: {
            name: 'David Thomas',
            nationality: 'British',
            bio: 'Co-author of The Pragmatic Programmer'
        }
    })
    const author3 = await prisma.author.create({
        data: {
            name: 'Kyle Simpson',
            nationality: 'American',
            bio: 'Author of the You Don\'t Know JS series'
        }
    })
    const author4 = await prisma.author.create({
        data: {
            name: 'Martin Fowler',
            nationality: 'British',
            bio: 'Author of Refactoring and Patterns of Enterprise Application Architecture'
        }
    })
    const author5 = await prisma.author.create({
        data: {
            name: 'Andrew Hunt',
            nationality: 'American',
            bio: 'Co-author of The Pragmatic Programmer'
        }
    })

    // Users
    await prisma.user.createMany({
        data: [
            {
                name: 'Ali Hassan',
                email: 'ali@example.com',
                password: 'hashed_password_1',
                role: 'admin'
            },
            {
                name: 'Sara Khalil',
                email: 'sara@example.com',
                password: 'hashed_password_2',
                role: 'user'
            },
            {
                name: 'Omar Mansour',
                email: 'omar@example.com',
                password: 'hashed_password_3',
                role: 'user'
            },
            {
                name: 'Lena Nasser',
                email: 'lena@example.com',
                password: 'hashed_password_4',
                role: 'user'
            },
            {
                name: 'Karim Diab',
                email: 'karim@example.com',
                password: 'hashed_password_5',
                role: 'user'
            }
        ]
    })

    // Books
    await prisma.book.createMany({
        data: [
            {
                title: 'Clean Code',
                price: 29.99,
                stock: 15,
                authorId: author1.id
            },
            {
                title: 'The Pragmatic Programmer',
                price: 39.99,
                stock: 10,
                authorId: author2.id
            },
            {
                title: 'You Don\'t Know JS',
                price: 24.99,
                stock: 20,
                authorId: author3.id
            },
            {
                title: 'Refactoring',
                price: 34.99,
                stock: 8,
                authorId: author4.id
            },
            {
                title: 'Clean Architecture',
                price: 32.99,
                stock: 12,
                authorId: author1.id
            }
        ]
    })

    console.log('Seed data created successfully')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })