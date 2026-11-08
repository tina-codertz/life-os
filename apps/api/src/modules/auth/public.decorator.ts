import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Every route needs an access token unless it's marked @Public() (on the method or the
// whole controller). Forgetting it on a new route gives a 401, not a data leak.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
