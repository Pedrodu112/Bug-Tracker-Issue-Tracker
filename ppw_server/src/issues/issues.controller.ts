import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssueTransitionDto } from './dto/issue-transition.dto';
import { IssuesUseCases } from './application/issues.use-cases';
import { IssueRole } from './domain/issue-transition';

@Controller('issues')
export class IssuesController {
  constructor(private readonly issues: IssuesUseCases) {}

  @Get()
  findAll() {
    return this.issues.findAll();
  }

  @Get(':id/actions')
  getAvailableActions(
    @Param('id', ParseIntPipe) id: number,
    @Query('actorRole') actorRole: string,
  ) {
    return this.issues.getAvailableActions(id, actorRole);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.issues.findOne(id);
  }

  @Post()
  create(@Body() data: CreateIssueDto) {
    return this.issues.create(data);
  }

  @Post(':id/transitions')
  transition(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: IssueTransitionDto,
  ) {
    return this.issues.transition(id, data);
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
