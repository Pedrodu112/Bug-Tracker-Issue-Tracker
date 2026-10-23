import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssuesUseCases } from './application/issues.use-cases';

@Controller('issues')
export class IssuesController {
  constructor(private readonly issues: IssuesUseCases) {}

  @Get()
  findAll() {
    return this.issues.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.issues.findOne(id);
  }

  @Post()
  create(@Body() data: CreateIssueDto) {
    return this.issues.create(data);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: UpdateIssueDto) {
    return this.issues.update(id, data);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.issues.remove(id);
  }
}
