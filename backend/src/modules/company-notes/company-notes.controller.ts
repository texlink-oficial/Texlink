import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CompanyNotesService } from './company-notes.service';
import { CreateCompanyNoteDto } from './dto/create-company-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';

@ApiTags('Company Notes')
@ApiBearerAuth()
@Controller('companies/:companyId/notes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CompanyNotesController {
  constructor(private readonly companyNotesService: CompanyNotesService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('attachments', 5))
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateCompanyNoteDto,
    @CurrentUser() user: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const mappedFiles = files?.map((f) => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      encoding: f.encoding,
      mimetype: f.mimetype,
      buffer: f.buffer,
      size: f.size,
    }));

    return this.companyNotesService.create(
      companyId,
      user.id,
      dto,
      mappedFiles,
    );
  }

  @Get()
  async findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: QueryNotesDto,
  ) {
    return this.companyNotesService.findAll(companyId, query);
  }

  @Delete(':noteId')
  async remove(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUser() user: any,
  ) {
    return this.companyNotesService.remove(companyId, noteId, user.id);
  }

  @Get(':noteId/attachments/:attachmentId/download')
  async downloadAttachment(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.companyNotesService.downloadAttachment(
      companyId,
      noteId,
      attachmentId,
    );
  }
}
