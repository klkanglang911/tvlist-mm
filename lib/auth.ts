/**
 * 简单的密码验证
 */
export function verifyPassword(password: string): boolean {
  // 临时硬编码确保登录正常
  const correctPassword = 'Capibalaa@0711';
  return password === correctPassword;
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
