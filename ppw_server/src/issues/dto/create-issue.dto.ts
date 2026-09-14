import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES, IssuePriority, IssueStatus, IssueType } from '../issue.interface';

export class CreateIssueDto {
  @IsInt() projectId!: number;
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() description!: string;
  @IsIn(ISSUE_TYPES) type!: IssueType;
  @IsIn(ISSUE_PRIORITIES) priority!: IssuePriority;
  @IsOptional() @IsIn(ISSUE_STATUSES) status?: IssueStatus;
  @IsString() assignee!: string;
}
