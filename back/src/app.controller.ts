import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/calendar/bulk')
  async bulk(@Body() body: any) {
    return this.appService.createEventsBulk(body);
  }
}