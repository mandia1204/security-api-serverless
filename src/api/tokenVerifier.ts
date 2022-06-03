import jwt from 'jsonwebtoken';
import fs from 'fs';

export function verifyToken(token: string): Promise<boolean> {
  return (new Promise<boolean>((resolve, reject) => {
    const keyPath = '/opt/keys/kms-public.key';
    const publicKey = fs.readFileSync(keyPath, 'utf8');
    jwt.verify(token, publicKey, (err, _) => {
        if (err) {
          console.log('Error validating token :>> ', err);
          return reject(err);
        }
        return resolve(true);
    });
  })).catch(_ => false);
}