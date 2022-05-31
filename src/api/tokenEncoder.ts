import { encode } from 'jwt-simple';
import moment from 'moment';
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

function getTokenPayload(userName: string, type: TokenType, authConfig: Auth) {
  const { exp } = authConfig[type];
  return {
    userName,
    iss: authConfig.issuer,
    aud: authConfig.audience,
    exp: moment().add(exp.amount, exp.unit).unix(),
  };
}

function encodeWithSecret(userName: string, type: TokenType, authConfig: Auth) {
  const payload = getTokenPayload(userName, type, authConfig);
  return encode(payload, authConfig[type].jwtSecret);
}

function sign(userName: string, type: TokenType, authConfig: Auth) {
  const payload = getTokenPayload(userName, type, authConfig);
	const keyPath = '/opt/keys/private-key.key';
  const privateKey = fs.readFileSync(keyPath, 'utf8');
  return encode(payload, privateKey, 'RS256');
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
  const command = getKmsSignCommand(message, authConfig);
  const data = await client.send(command);
  const encodedSignature = base64url.encode(Buffer.from(data.Signature as Uint8Array), 'base64');
  tokenComponents.signature = encodedSignature
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${tokenComponents.header}.${tokenComponents.payload}.${tokenComponents.signature}`;
}

async function encodeToken(userName: string, type: TokenType, authConfig: Auth): Promise<string> {
	console.info(`encoding token, useRsa:${authConfig.useRsa}, useKms:${authConfig.useKms}, type: ${type}`);
  if (authConfig.useRsa) {
    return sign(userName, type, authConfig);
  } if (authConfig.useRsa && authConfig.useKms) {
    return signWithKms(userName, type, authConfig);
  }
  return encodeWithSecret(userName, type, authConfig);
}

const tokenEncoder = () => ({
  encodeToken,
});
export default tokenEncoder;
