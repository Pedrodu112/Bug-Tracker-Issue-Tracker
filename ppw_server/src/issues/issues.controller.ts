import {
  Body, Controller, Delete, Get, Headers, HttpCode, HttpException,
  Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssueTransitionDto } from './dto/issue-transition.dto';
import { IssuesUseCases } from './application/issues.use-cases';

@Controller('issues')
export class IssuesController {
  constructor(private readonly issues: IssuesUseCases) {}

  @Get('audit')
  getAuditLog() {
    return this.issues.getAuditLog();
  }

  @Get()
  findAll() {
    return this.issues.findAll();
  }

  @Get(':id/actions')
  getAvailableActions(@Param('id', ParseIntPipe) id: number, @Query('actorRole') actorRole: string) {
    return this.issues.getAvailableActions(id, actorRole);
  }

  @Get(':id/history')
  getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.issues.getHistory(id);
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
    @Headers('if-match') ifMatch?: string,
  ) {
    return this.issues.transition(id, data, this.parseExpectedVersion(ifMatch));
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateIssueDto,
    @Headers('if-match') ifMatch?: string,
  ) {
    return this.issues.update(id, data, this.parseExpectedVersion(ifMatch));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.issues.remove(id);
  }

  private parseExpectedVersion(ifMatch?: string): number {
    const normalized = ifMatch?.trim().replace(/^W\//, '').replace(/^"|"$/g, '');
    const version = Number(normalized);
    if (!normalized || !/^\d+$/.test(normalized) || !Number.isSafeInteger(version) || version < 1) {
      throw new HttpException(
        'Envie o cabeçalho If-Match com a versão atual da issue, por exemplo: "1".',
        428,
      );
    }
    return version;
  }
}
