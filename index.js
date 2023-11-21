const express = require('express')
const mysql = require('mysql2')
const cookieParser = require('cookie-parser')
const crypto = require('crypto')

const app = express()

app.use(express.static('public'))

app.set('view engine', 'ejs')

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'wpr',
    password: 'fit2023',
    database: 'wpr2023',
    port: '3306'
})

function renderPage(res, title, main, user) {
    res.render('layout', { title: title, main: main, user: user })
}

function hashPassword(password) {
    const hash = crypto.createHash('sha256')
    hash.update(password)
    const hashedPassword = hash.digest('hex')
    return hashedPassword
}

function checkPassword(plaintextPassword, hashedPassword) {
    const hashedPlaintextPassword = hashPassword(plaintextPassword)
    return hashedPlaintextPassword === hashedPassword
}

function generateUniqueAccessToken() {
    let token = crypto.randomBytes(64).toString('hex')
    let exists = checkIfTokenExists(token)

    while (exists) {
        token = crypto.randomBytes(64).toString('hex')
        exists = checkIfTokenExists(token)
    }

    return token
}

function checkIfTokenExists(token) {
    const query = 'SELECT * FROM User WHERE token = ?'
    const results = connection.query(query, [token])
    return results.length > 0
}

function getExpirationTime(seconds) {
    const unixTimeInSeconds = Math.floor(Date.now() / 1000)
    return unixTimeInSeconds + seconds / 1000
}

// Homepage (Sign-in page)
app.get('/', (req, res) => {
    // Check if the user is already logged in
    if (req.cookies.userAccessToken) {
        // Redirect to inbox page if logged in
        res.redirect('/inbox')
    } else {
        // Render the sign-in page
        renderPage(res, 'Sign in', 'signin', null)
    }
})

// Sign-up page route
app.get('/signup', (req, res) => {
    renderPage(res, 'Sign up', 'signup')
})

// Inbox page route
app.get('/inbox', (req, res) => {
    if (!req.cookies.accessToken) {
        return res.redirect('/')
    }
    try {
        const email = req.cookies.email
        const fullName = req.cookies.fullName
        const token = req.cookies.accessToken
        const query = 'SELECT * FROM User WHERE email = ? AND expirationTime > NOW()'
        connection.query(query, [email], (err, result) => {
            if (err) throw err
            if (result.length > 0 && result[0].token === token) {
                const userObject = { email: email, fullName: fullName }
                renderPage(res, 'Inbox', 'inbox', userObject)
            } else {
                res.redirect('/')
            }
        })
    } catch (error) {
        console.error('Error decrypting user data:', error)
        res.redirect('/')
    }
})

// Outbox page route
app.get('/outbox', (req, res) => {
    if (!req.cookies.userAccessToken) {
        return res.redirect('/')
    }
    const email = req.cookies.email
    const fullName = req.cookies.fullName
    const userObject = { email: email, fullName: fullName }
    renderPage(res, 'Outbox', 'outbox', userObject)
})

// Compose page route
app.get('/compose', (req, res) => {
    if (!req.cookies.userAccessToken) {
        return res.redirect('/')
    }
    const email = req.cookies.email
    const fullName = req.cookies.fullName
    const userObject = { email: email, fullName: fullName }
    renderPage(res, 'Compose', 'compose', userObject)
})

app.post('/signin', (req, res) => {
    const { email, password } = req.body
    const oneDay = 60 * 60 * 24 * 1000
    const query = 'SELECT * FROM User WHERE email = ?'
    connection.query(query, [email], async (err, result) => {
        if (err) throw err
        if (result.length > 0 && checkPassword(password, result[0].password)) {
            const token = generateUniqueAccessToken()
            const expirationTime = getExpirationTime(oneDay)
            const insertToken = 'UPDATE User SET token = ?, expirationTime = FROM_UNIXTIME(?) WHERE email = ?;'
            connection.query(insertToken, [token, expirationTime, result[0].email], (err) => {
                if (err) throw err
            })
            res.cookie('email', email, { maxAge: oneDay })
            res.cookie('fullName', result[0].fullName, { maxAge: oneDay })
            res.cookie('accessToken', token, { maxAge: oneDay })
            res.redirect('/inbox')
        } else {
            res.send('Login failed. Please check your email and password.')
        }
    })
})


// Signup route
app.post('/signup', (req, res) => {
    const { fullName, email, password, rePassword } = req.body
    // Validate form data
    if (!fullName || !email || !password || password !== rePassword) {
        return res.send('Invalid form data. Please fill in all fields and ensure passwords match.')
    }
    // Check if the email is already used
    const checkEmailQuery = 'SELECT * FROM User WHERE email = ?'
    connection.query(checkEmailQuery, [email], (err, result) => {
        if (err) throw err
        if (result.length > 0) {
            return res.send('Email address is already in use. Please choose another.')
        }
        // Insert new user into the database
        const hashedPassword = hashPassword(password)
        const insertUserQuery = 'INSERT INTO User (fullName, email, password) VALUES (?, ?, ?)'
        connection.query(insertUserQuery, [fullName, email, hashedPassword], (err) => {
            if (err) throw err
            // Send success message
            res.send('User created successfully. You can now <a href="/">sign in</a>.')
        })
    })
})

// Sign-out route
app.get('/signout', (req, res) => {
    // Clear the user cookies
    res.clearCookie('email')
    res.clearCookie('fullName')
    res.clearCookie('accessToken')

    // Redirect to the homepage (sign-in page)
    res.redirect('/')
})


app.listen(8000, () => {
    console.log('Server started on port 8000')
})
