const express = require('express');
const router = new express.Router();
const ExpressError = require('../expressError');

const Message = require('../models/message');
const { ensureLoggedIn } = require('../middleware/auth');

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.post('/:id', ensureLoggedIn, async function (req, res, next) {
    try {
        const { id } = req.params;

        // get message from the database
        const message = await Message.get(id);

        // Make sure that the currently-logged-in users is either the to or from user
        if (
            req.user.username !== message.from_username &&
            req.user.username !== message.to_username
        ) {
            throw new ExpressError(
                'Only the users that are associated with this message can access it',
                400
            );
        }

        if (!message) {
            throw new ExpressError('Invalid message id', 400);
        }
        return res.json(message);
    } catch (err) {
        return next(err);
    }
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post('/', ensureLoggedIn, async function (req, res, next) {
    try {
        const { toUsername, body } = req.body;
        // get from user name from logged in user to avoid fake messages being made
        const fromUsername = req.user.username;

        // create user in the database
        const message = await Message.create(fromUsername, toUsername, body);

        // log in user and return token
        if (message) {
            return res.json({ message });
        }
    } catch (err) {
        return next(err);
    }
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/
router.post('/:id/read', ensureLoggedIn, async function (req, res, next) {
    try {
        const { id } = req.params;

        // get message the database
        const message = await Message.get(id);

        // Make sure that the only the intended recipient can mark as read.
        if (message.to_username !== req.username) {
            throw new ExpressError(
                'Only the intended recipient can mark a message as read',
                400
            );
        }
        // mark as read
        Message.markRead(id);
    } catch (err) {
        return next(err);
    }
});

module.exports = router;