import bcryptjs from 'bcryptjs';
async function hashPassword() {
    const password = 'MySecurePassword123'; // Это твой новый пароль
    const hash = await bcryptjs.hash(password, 10);
    console.log(hash);
}
hashPassword();