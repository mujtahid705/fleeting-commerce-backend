import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  healthCheck() {
    return {
      message: 'Backend is running',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
