import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

// argon2id (the library's default algorithm) with OWASP's minimum settings: 19 MiB of memory,
// 2 passes, 1 thread, about 30–50 ms per hash. The memory cost is what makes guessing
// expensive on GPUs. The settings and a random salt are stored inside the hash string
// ("$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>"), so they can be raised later without
// breaking existing passwords.
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
