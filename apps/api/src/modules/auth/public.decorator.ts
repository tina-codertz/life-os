import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

export const IS_PUBLIC_KEY = 'isPublic';

// Every route needs an access token unless it's marked @Public() (on the method or the
// whole controller). Forgetting it on a new route gives a 401, not a data leak.
// The empty ApiSecurity tells Swagger this route needs no token.
export const Public = () => applyDecorators(SetMetadata(IS_PUBLIC_KEY, true), ApiSecurity({}));
