const bcrypt = require('bcrypt');
const { BCRYPT_WORK_FACTOR } = require('../config');
const db = require('../db');
const ExpressError = require('../expressError');

/** User class for message.ly */

/** User of the site. */

class User {
  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    try {
      const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

      const result = await db.query(
        `INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
               VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
               RETURNING username, password, first_name, last_name, phone`,
        [username, hashedPassword, first_name, last_name, phone]
      );

      return result.rows[0];
    } catch (err) {
      throw new ExpressError(err.message, 400);
    }
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    try {
      const result = await db.query(
        `SELECT password FROM users WHERE username = $1`,
        [username]
      );
      const user = result.rows[0];

      if (user) {
        return await bcrypt.compare(password, user.password);
      }
      throw new ExpressError('Invalid user/password', 400);
    } catch (err) {
      throw new ExpressError(err.message, 400);
    }
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    try {
      const result = await db.query(
        `UPDATE users 
          SET last_login_at = current_timestamp
         WHERE username = $1
         RETURNING username, last_login_at`,
        [username]
      );

      if (result.rows[0]) {
        return result.rows[0];
      }
      throw new ExpressError(`Invalid user: ${username}`, 400);
    } catch (err) {
      throw new ExpressError(err.message, 400);
    }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    try {
      const result = await db.query(
        `SELECT username,
                first_name,
                last_name,
                phone
         FROM users`
      );
      return result.rows;
    } catch (err) {
      throw new ExpressError(err.message, 400);
    }
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    try {
      const result = await db.query(
        `SELECT username,
                first_name,
                last_name,
                phone,
                join_at,
                last_login_at FROM users WHERE username = $1`,
        [username]
      );
      const user = result.rows[0];

      if (user) {
        return user;
      }
      throw new ExpressError('Invalid user/password', 400);
    } catch (err) {
      throw new ExpressError(err.message, 400);
    }
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    try {
      const result = await db.query(
        `SELECT m.id,
              m.to_username,
              t.first_name,
              t.last_name,
              t.phone,
              m.body,
              m.sent_at,
              m.read_at
        FROM messages AS m
          JOIN users AS t ON m.to_username = t.username
        WHERE m.from_username = $1`,
        [username]
      );

      let messages = result.rows.map((r) => ({
        id: r.id,
        to_user: {
          username: r.to_username,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone,
        },
        body: r.body,
        sent_at: r.sent_at,
        read_at: r.read_at,
      }));
      return messages;
    } catch (err) {
      throw new ExpressError(err.message, 400);
    }
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    try {
      const result = await db.query(
        `SELECT m.id,
              m.from_username,
              f.first_name,
              f.last_name,
              f.phone,
              m.body,
              m.sent_at,
              m.read_at
        FROM messages AS m
          JOIN users AS f ON m.from_username = f.username
        WHERE m.to_username = $1`,
        [username]
      );

      let messages = result.rows.map((r) => ({
        id: r.id,
        from_user: {
          username: r.from_username,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone,
        },
        body: r.body,
        sent_at: r.sent_at,
        read_at: r.read_at,
      }));
      return messages;
    } catch (err) {
      throw new ExpressError(err.message, 400);
    }
  }
}

module.exports = User;