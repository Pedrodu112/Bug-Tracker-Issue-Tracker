import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssuesService } from './issues.service';

@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}
  @Get() findAll() { return this.issuesService.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.issuesService.findOne(id); }
  @Post() create(@Body() data: CreateIssueDto) { return this.issuesService.create(data); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() data: UpdateIssueDto) { return this.issuesService.update(id, data); }
  @Delete(':id') @HttpCode(204) remove(@Param('id', ParseIntPipe) id: number) { this.issuesService.remove(id); }
}
