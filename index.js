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

const connection = mysql.createPool({
    host: 'localhost',
    user: 'wpr',
    password: 'fit2023',
    database: 'wpr2023',
    port: '3306'
}).promise()

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
    connection.query(query, [token], (err, results) => {
        if (err) throw err
        return results.length > 0
    })
}

function getExpirationTime(seconds) {
    const unixTimeInSeconds = Math.floor(Date.now() / 1000)
    return unixTimeInSeconds + seconds / 1000
}

function authenticate(req) {
    const email = req.cookies.email
    const fullName = req.cookies.fullName
    const token = req.cookies.accessToken
    try {
        const query = 'SELECT * FROM User WHERE email = ? AND expirationTime > NOW()'
        connection.query(query, [email], (err, results) => {
            if (err) throw err
            if (results.length > 0 && results[0].token === token) {
                const userObject = { email: email, fullName: fullName }
                return userObject
            } else {
                return null
            }
        })
    } catch (error) {
        console.error(error)
        return null
    }
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
    const userObject = authenticate(req)
    if (userObject) {
        renderPage(res, 'Inbox', 'inbox', userObject)
    }
    else {
        res.redirect('/')
    }
})


// Outbox page route
app.get('/outbox', (req, res) => {
    const userObject = authenticate(req)
    if (userObject != null) {
        renderPage(res, 'Outbox', 'outbox', userObject)
    }
    else {
        res.redirect('/')
    }
})

// Compose page route
app.get('/compose', (req, res) => {
    const userObject = authenticate(req)
    if (userObject != null) {
        renderPage(res, 'Compose', 'compose', userObject)
    }
    else {
        res.redirect('/')
    }
})

app.post('/signin', (req, res) => {
    const { email, password } = req.body
    const oneDay = 60 * 60 * 24 * 1000
    const query = 'SELECT * FROM User WHERE email = ?'
    connection.query(query, [email], (err, results) => {
        if (err) throw err
        if (results.length > 0 && checkPassword(password, results[0].password)) {
            const token = generateUniqueAccessToken()
            const expirationTime = getExpirationTime(oneDay)
            const insertToken = 'UPDATE User SET token = ?, expirationTime = FROM_UNIXTIME(?) WHERE email = ?;'
            connection.query(insertToken, [token, expirationTime, results[0].email], (err, tokenResults) => {
                if (err) throw err
                res.cookie('email', email, { maxAge: oneDay })
                res.cookie('fullName', results[0].fullName, { maxAge: oneDay })
                res.cookie('accessToken', token, { maxAge: oneDay })
                res.redirect('/inbox')
            })
        } else {
            res.send('Login failed. Please check your email and password.')
        }
    })

})

app.post('/checkEmail', (req, res) => {
    const { email } = req.body
    const query = `SELECT * FROM User WHERE email = ?`
    connection.query(query, [email], (err, results) => {
        if (err) throw err
        if (results.length > 0) {
            res.json({ exists: true })
        } else {
            res.json({ exists: false })
        }
    })
})
// Signup route
app.post('/signup', (req, res) => {
    const { fullName, email, password, rePassword } = req.body
    if (!fullName || !email || !password || password !== rePassword) {
        return res.send('Invalid form data. Please fill in all fields and ensure passwords match.')
    }
    const checkEmailQuery = 'SELECT * FROM User WHERE email = ?'
    connection.query(checkEmailQuery, [email], (err, result) => {
        if (err) throw err
        if (result.length > 0) {
            return res.send('Email address is already in use. Please choose another.')
        }
        const hashedPassword = hashPassword(password)
        const insertUserQuery = 'INSERT INTO User (fullName, email, password) VALUES (?, ?, ?)'
        connection.query(insertUserQuery, [fullName, email, hashedPassword], (err) => {
            if (err) throw err
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
