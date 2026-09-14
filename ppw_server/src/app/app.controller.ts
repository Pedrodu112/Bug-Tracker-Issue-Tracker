import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  status() { return { message: 'Bug Tracker API online' }; }
}
