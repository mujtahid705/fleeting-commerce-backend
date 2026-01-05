import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Domain = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-tenant-domain'] || request.headers['domain'];
  },
);
