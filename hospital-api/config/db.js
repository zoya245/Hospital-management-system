const mysql = require('mysql2/promise');

const uri = process.env.DATABASE_URL || 'mysql://3WF9pNe8JQjU22i.root:sIuwPXJjaCpE8kmS@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}';

const pool = mysql.createPool(uri);

// Test connection
pool.getConnection()
    .then(conn => {
        console.log('✅ TiDB Cloud Connected successfully!');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Database Connection Failed:', err.message);
    });

module.exports = pool;