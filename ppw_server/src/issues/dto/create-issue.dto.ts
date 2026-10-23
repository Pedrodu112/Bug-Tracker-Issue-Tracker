import { IsIn, IsInt, IsNotEmpty, IsString, Matches, Min } from 'class-validator';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  IssuePriority,
  IssueStatus,
  IssueType,
} from '../issue.interface';

export class CreateIssueDto {
  @IsInt()
  @Min(1)
  projectId!: number;

  @IsString()
  @Matches(/\S/, { message: 'O título não pode ficar vazio.' })
  title!: string;

  @IsString()
  @Matches(/\S/, { message: 'A descrição não pode ficar vazia.' })
  description!: string;

  @IsIn(ISSUE_TYPES)
  type!: IssueType;

  @IsIn(ISSUE_PRIORITIES)
  priority!: IssuePriority;

  @IsIn(ISSUE_STATUSES)
  status?: IssueStatus;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'O responsável não pode ficar vazio.' })
  assignee!: string;
}
