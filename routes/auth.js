const express = require('express');
const router = new express.Router();
const ExpressError = require('../expressError');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { SECRET_KEY } = require('../config');
const db = require('../db');

const User = require('../models/user');

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/
router.post('/login', async function (req, res, next) {
    try {
        const { username, password } = req.body;
        const result = await db.query(
            `SELECT password FROM users WHERE username = $1`,
            [username]
        );
        const user = result.rows[0];

        if (user) {
            if ((await bcrypt.compare(password, user.password)) === true) {
                // update timestamp
                await User.updateLoginTimestamp(username);
                // sign token
                let token = jwt.sign(
                    {
                        username,
                    },
                    SECRET_KEY
                );
                return res.json({ token });
            }
        }
        throw new ExpressError('Invalid user/password', 400);
    } catch (err) {
        return next(err);
    }
});

/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */
router.post('/register', async function (req, res, next) {
    try {
        const { username, password, first_name, last_name, phone } = req.body;

        // create user in the database
        const user = await User.register({
            username,
            password,
            first_name,
            last_name,
            phone,
        });

        // log in user and return token
        if (user) {
            if ((await bcrypt.compare(password, user.password)) === true) {
                // update timestamp
                await User.updateLoginTimestamp(user.username);
                // sign token
                let token = jwt.sign(
                    {
                        username,
                    },
                    SECRET_KEY
                );
                return res.json({ token });
            }
        }
    } catch (err) {
        return next(err);
    }
});

module.exports = router;