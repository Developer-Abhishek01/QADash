import { IsString, IsArray, IsOptional, IsObject } from 'class-validator';

export class ParseDocumentDto {
  @IsString()
  document: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class GenerateTestsDto {
  @IsArray()
  requirements: Array<{
    id: string;
    title: string;
    description: string;
    module: string;
    priority: string;
  }>;

  @IsOptional()
  @IsString()
  framework?: string;
}

export class RequirementsListDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  offset?: number;

  @IsOptional()
  limit?: number;
}
