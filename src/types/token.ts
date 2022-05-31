export type Duration = 'hour' | 'month' | 'minutes';

export interface Token {
    jwtSecret: string,
    exp: { amount: number, unit: Duration}
  }

export interface TokenComponents {
    header: string,
    payload: string,
    signature?: string,
}

export type TokenType = 'accessToken' | 'refreshToken';