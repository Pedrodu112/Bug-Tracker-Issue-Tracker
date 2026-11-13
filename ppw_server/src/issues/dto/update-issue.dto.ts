import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateIssueDto } from './create-issue.dto';

// O tipo determina o fluxo de estados e não pode ser alterado depois da criação.
export class UpdateIssueDto extends PartialType(OmitType(CreateIssueDto, ['type'] as const)) {}
