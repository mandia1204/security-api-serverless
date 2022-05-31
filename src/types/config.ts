import { Token } from "./token"

export interface Auth {
  useRsa: boolean,
  useKms: boolean,
  kmsId: string,
  issuer: string,
  audience: string[],
  accessToken: Token,
  refreshToken: Token,
  jwtSession: { session: boolean}
}

export interface RedisConfig {
  host: string,
  port: number
}

export interface Config {
  auth: Auth,
  redis: RedisConfig
}
