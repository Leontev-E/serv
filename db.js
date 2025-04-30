import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

pool.on('acquire', () => {
    console.log('Connection acquired');
});
pool.on('release', () => {
    console.log('Connection released');
});

const pool = mysql.createPool({
    host: 'evgenl9s.beget.tech',
    user: 'evgenl9s_klm_wik',
    password: 'ATKPamOM6!r&',
    database: 'evgenl9s_klm_wik',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    charset: 'utf8mb4'
});

export default pool;
