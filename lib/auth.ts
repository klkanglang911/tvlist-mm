/**
 * 简单的密码验证
 */
export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;

  // 如果环境变量未设置，使用备用密码
  const finalPassword = adminPassword || 'Capibalaa@0711';

  return password === finalPassword;
}

/**
 * 生成简单的 session token
 */
export function generateToken(): string {
  return Buffer.from(
    `${Date.now()}-${Math.random().toString(36).substring(2)}`
  ).toString('base64');
}

/**
 * 验证 session token (简单实现，生产环境建议使用 JWT)
 */
export function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [timestamp] = decoded.split('-');
    const tokenTime = parseInt(timestamp);
    const now = Date.now();

    // Token 有效期 24 小时
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    return now - tokenTime < TWENTY_FOUR_HOURS;
  } catch {
    return false;
  }
}
