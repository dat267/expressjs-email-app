const express = require('express')
const mysql = require('mysql2')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const User = require('./models/User')

const app = express()

// Set view engine to EJS
app.set('view engine', 'ejs')

// Middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(session({
    key: 'userId',
    secret: 'secretkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 60 * 60 * 24 // 1 day
    }
}))

// DB connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'wpr',
    password: 'fit2023',
    database: 'wpr2023',
    port: '3306'
})

function renderPage(res, title, main, auth) {
    res.render('layout', { title: title, main: main, auth: auth })
}

// Homepage (Sign-in page)
app.get('/', (req, res) => {
    // Check if the user is already logged in
    if (req.session.userId) {
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
    // Check if the user is authenticated
    if (!req.session.userId) {
        // Redirect to signin page if not authenticated
        return res.redirect('/')
    }
    // Authenticated user information
    const auth = {
        userId: req.session.userId,
        // Add other user information you want to pass to the template, e.g., fullName
        fullName: req.session.fullName,
        email: req.session.email
    }
    // Render the inbox page if authenticated
    renderPage(res, 'Inbox', 'inbox', auth)
})

// Sign-in route
app.post('/signin', (req, res) => {
    const { email, password, remember } = req.body
    // Query the database
    const query = 'SELECT * FROM User WHERE email = ?'
    db.query(query, [email], (err, result) => {
        if (err) throw err
        // Check if user exists and password matches
        if (result.length > 0 && result[0].password === password) {
            // Store user information in session
            req.session.userId = result[0].id
            req.session.fullName = result[0].fullName
            req.session.email = result[0].email
            // Set a cookie if "Remember me" is checked
            if (remember === 'yes') {
                res.cookie('rememberMe', result[0].id, { maxAge: 60 * 60 * 24 * 1000 }) // 1 day
            }
            // Redirect to inbox page
            res.redirect('/inbox')
        } else {
            // Show error message
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
    db.query(checkEmailQuery, [email], (err, result) => {
        if (err) throw err

        if (result.length > 0) {
            return res.send('Email address is already in use. Please choose another.')
        }

        // Insert new user into the database
        const insertUserQuery = 'INSERT INTO User (fullName, email, password) VALUES (?, ?, ?)'
        db.query(insertUserQuery, [fullName, email, password], (err) => {
            if (err) throw err

            // Send success message
            res.send('User created successfully. You can now <a href="/signin">sign in</a>.')
        })
    })
})

// Sign-out route
app.get('/signout', (req, res) => {
    // Clear the user session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err)
            return res.status(500).send('Internal Server Error')
        }
        // Clear the rememberMe cookie
        res.clearCookie('rememberMe')
        // Redirect to the homepage (sign-in page)
        res.redirect('/')
    })
})


app.listen(8000, () => {
    console.log('Server started on port 8000')
})
