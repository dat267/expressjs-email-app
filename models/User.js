const crypto = require('crypto')
const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2023',
  database: 'wpr2023',
  port: 3306
})

exports.User = class {
  /**
   * Registers a new user by validating and storing user information in the database.
   * @param {string} fullName - The full name of the user.
   * @param {string} email - The email address of the user.
   * @param {string} password - The user's chosen password.
   * @param {string} rePassword - The repeated password for confirmation.
   * @returns {Promise<object>} - A Promise that resolves to an object representing the registered user with properties such as email, fullName, and password.
   * @throws {Error} - Throws an error if any of the required fields is missing, passwords do not match, if the email address is already in use, or if the password is too short.
   */
  static async signup (fullName, email, password, rePassword) {
    const errors = []

    if (!fullName) {
      errors.push(new Error('Full name is required.'))
    }
    if (!email) {
      errors.push(new Error('Email is required.'))
    }
    if (!password) {
      errors.push(new Error('Password is required.'))
    }
    if (password.length < 6) {
      errors.push(new Error('Password must be at least 6 characters long.'))
    }
    if (password !== rePassword) {
      errors.push(new Error('Passwords do not match.'))
    }

    const checkEmailQuery = 'SELECT * FROM User WHERE email = ?'
    const [result] = await pool.query(checkEmailQuery, [email])

    if (Array.isArray(result) && result.length > 0) {
      errors.push(new Error('Email address is already in use. Please choose another.'))
    }

    if (errors.length > 0) {
      throw errors
    }

    const hashedPassword = hashPassword(password)
    const user = {
      email,
      fullName,
      password: hashedPassword
    }

    const insertUserQuery = 'INSERT INTO User (fullName, email, password) VALUES (?, ?, ?)'
    await pool.query(insertUserQuery, [user.fullName, user.email, user.password])

    return user
  }

  /**
   * Authenticates a user by verifying the provided email and password, generating an access token upon successful authentication.
   * @param {string} email - The email address of the user attempting to sign in.
   * @param {string} password - The password provided by the user for authentication.
   * @returns {Promise<object>} - A Promise that resolves to an object representing the authenticated user with properties such as email, token, and expirationTime.
   * @throws {Error[]} - Throws an error if the email or password is missing, if the email is not found in the database, or if the provided password is invalid.
   */
  static async signin (email, password) {
    const errors = []

    if (!email) {
      errors.push(new Error('Email is required'))
    }
    if (!password) {
      errors.push(new Error('Password is required'))
    }

    if (errors.length > 0) {
      throw errors
    }

    const query = 'SELECT * FROM User WHERE email = ?'
    const [results] = await pool.query(query, [email])
    const user = results[0]

    if (user && checkPassword(password, user.password)) {
      const token = await generateUniqueAccessToken()
      const expirationTime = getExpirationTime(60 * 60 * 24)
      const updateTokenQuery = 'UPDATE User SET token = ?, expirationTime = FROM_UNIXTIME(?) WHERE id = ?'
      await pool.query(updateTokenQuery, [token, expirationTime, user.id])

      user.token = token
      user.expirationTime = expirationTime
      return user
    } else {
      errors.push(new Error('Invalid email or password'))
      throw errors
      // throw new Error('Invalid email or password')
    }
  }

  /**
   * Authenticates a user based on their email and access token, ensuring the token is valid and within the expiration time.
   * @param {string} email - The email address of the user attempting to authenticate.
   * @param {string} token - The access token provided by the user for authentication.
   * @returns {Promise<object>} - A Promise that resolves to an object representing the authenticated user with properties such as email and token.
   * @throws {Error} - Throws an error if the email or token is missing, if the user is not found, if the token is invalid, or if the token has expired.
   */
  static async authenticate (email, token) {
    const errors = []

    if (!email) {
      errors.push(new Error('Email is required'))
    }
    if (!token) {
      errors.push(new Error('Token is required'))
    }

    if (errors.length > 0) {
      throw errors
    }

    const query = 'SELECT * FROM User WHERE email = ? AND expirationTime > NOW()'
    const [results] = await pool.query(query, [email])

    // @ts-ignore
    if (Array.isArray(results) && results.length > 0 && results[0].token === token) {
      return results[0]
    } else if (Array.isArray(results) && results.length > 0) {
      errors.push(new Error('Invalid token'))
      throw errors
    } else {
      errors.push(new Error('User not found'))
      throw errors
    }
  }

  /**
   * Retrieves a user from the database based on their email address.
   * @param {string} email - The email address of the user to be retrieved.
   * @returns {Promise<object|null>} - A Promise that resolves to an object representing the user found in the database, or null if the user is not found.
   * @throws {Error} - Throws an error if the email is missing.
   */
  static async getUserByEmail (email) {
    if (!email) {
      throw new Error('Email is required')
    }

    const query = 'SELECT * FROM User WHERE email = ?'
    const [results] = await pool.query(query, [email])

    // @ts-ignore
    const user = results.length > 0 ? results[0] : null
    return user
  }
}

/**
 * Hashes a password using the SHA-256 algorithm.
 * @param {string} password - The password to be hashed.
 * @returns {string} - The hashed password represented as a hexadecimal string.
 */
function hashPassword (password) {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  const hashedPassword = hash.digest('hex')
  return hashedPassword
}

/**
 * Checks if a plaintext password matches a hashed password.
 * @param {string} plaintextPassword - The plaintext password to be checked.
 * @param {string} hashedPassword - The hashed password to compare against.
 * @returns {boolean} - Returns true if the plaintext password matches the hashed password, otherwise false.
 */
function checkPassword (plaintextPassword, hashedPassword) {
  const hashedPlaintextPassword = hashPassword(plaintextPassword)
  return hashedPlaintextPassword === hashedPassword
}

/**
 * Checks if a token exists in the User table.
 * @param {string} token - The token to be checked.
 * @returns {Promise<boolean>} - A Promise that resolves to true if the token exists in the User table, otherwise false.
 */
async function checkIfTokenExists (token) {
  const query = 'SELECT * FROM User WHERE token = ?'
  const [results] = await pool.query(query, [token])

  if (Array.isArray(results)) {
    return results.length > 0
  }

  return false
}

/**
 * Generates a unique access token by creating a random token and ensuring its uniqueness.
 * @returns {Promise<string>} - A Promise that resolves to a unique access token as a hexadecimal string.
 */
async function generateUniqueAccessToken () {
  let token = crypto.randomBytes(64).toString('hex')
  let exists = await checkIfTokenExists(token)

  while (exists) {
    token = crypto.randomBytes(64).toString('hex')
    exists = await checkIfTokenExists(token)
  }

  return token
}

/**
 * Calculates the expiration time based on the current Unix time and a specified duration in seconds.
 * @param {number} seconds - The duration in seconds for which the expiration time is calculated.
 * @returns {number} - The calculated expiration time as a Unix timestamp in seconds.
 */
function getExpirationTime (seconds) {
  const unixTimeInSeconds = Math.floor(Date.now() / 1000)
  return unixTimeInSeconds + seconds
}
