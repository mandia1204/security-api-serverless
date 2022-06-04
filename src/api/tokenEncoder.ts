import jwt from 'jsonwebtoken';
import ms from 'ms';
import fs from 'fs';
import base64url from 'base64url';
import { KMSClient, SignCommand } from '@aws-sdk/client-kms';
import { Auth } from '../types/config';
import { TokenComponents, TokenType } from '../types/token';

function getKmsSignCommand(message: Uint8Array | undefined, authConfig: Auth) {
  return new SignCommand({
    KeyId: authConfig.kmsId,
    SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256',
    Message: message,
  });
}

function calculateExp(time: string): number {
  var timestamp = Math.floor(Date.now() / 1000);
  var milliseconds = ms(time);
  return Math.floor(timestamp + milliseconds / 1000);
}

function getTokenPayload(userName: string, type: TokenType, authConfig: Auth) {
  const { exp } = authConfig[type];
  return {
    userName,
    iss: authConfig.issuer,
    aud: authConfig.audience,
    exp: calculateExp(`${exp.amount} ${exp.unit}`)
  };
}

function encodeWithSecret(userName: string, type: TokenType, authConfig: Auth) {
  const payload = getTokenPayload(userName, type, authConfig);
  return jwt.sign(payload, authConfig[type].jwtSecret);
}

function sign(userName: string, type: TokenType, authConfig: Auth) {
  const payload = getTokenPayload(userName, type, authConfig);
	const keyPath = '/opt/keys/private-key.key';
  const privateKey = fs.readFileSync(keyPath, 'utf8');
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256'
  });
}

const header = {
  alg: 'RS256',
  typ: 'JWT',
};

const client = new KMSClient({ region: 'us-east-2' });

async function signWithKms(userName: string, type: TokenType, authConfig: Auth) {
  const payload = getTokenPayload(userName, type, authConfig);
  
  const tokenComponents: TokenComponents = {
    header: base64url(JSON.stringify(header)),
    payload: base64url(JSON.stringify(payload)),
  };

  const message = Buffer.from(`${tokenComponents.header}.${tokenComponents.payload}`);
  console.info(`calling kms...`);
  const command = getKmsSignCommand(message, authConfig);
  const data = await client.send(command);
  const encodedSignature = base64url.encode(Buffer.from(data.Signature as Uint8Array), 'base64');
  tokenComponents.signature = encodedSignature
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  console.info(`got token using kms`);
  return `${tokenComponents.header}.${tokenComponents.payload}.${tokenComponents.signature}`;
}

async function encodeToken(userName: string, type: TokenType, authConfig: Auth): Promise<string> {
	console.info(`encoding token, useRsa:${authConfig.useRsa}, useKms:${authConfig.useKms}, type: ${type}`);
  if (authConfig.useRsa && authConfig.useKms) {
    return signWithKms(userName, type, authConfig);
  } else if (authConfig.useRsa) {
    return sign(userName, type, authConfig);
  }
  return encodeWithSecret(userName, type, authConfig);
}

const tokenEncoder = () => ({
  encodeToken,
});
export default tokenEncoder;
